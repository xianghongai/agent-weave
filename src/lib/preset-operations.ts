import { createPresetWorkspace } from '@/lib/presets';
import type { Agent, Rule, ToolRef, ToolType, Workspace } from '@/lib/workspace';
import { type OperationContext, systemContext } from '@/lib/workspace-operations';

/*
 * 预设相关的工作区操作：合并预设与重置为预设。
 * 与其他工作区操作一样是纯函数，不修改传入的对象，也不抛异常。
 * 合并结果中的报告只供界面展示、不持久化，因此属性名使用 camelCase。
 */

type KeyedKind = 'tag' | 'command_tool' | 'mcp_server';

/**
 * 被跳过的预设条目。
 * - `keyConflict`：预设条目的标识与工作区中另一个条目相同。Agent 以名称作为标识，`key` 中即为名称。
 * - `toolSkipped`：规则所指的工具在合并后的工作区中不存在，通常是该工具因标识冲突被跳过。
 */
export type MergeSkip =
  | { kind: KeyedKind | 'agent'; id: string; key: string; reason: 'keyConflict' }
  | { kind: 'built_in_tool'; id: string; key: string; agentName: string; reason: 'keyConflict' }
  | { kind: 'rule'; id: string; tool: { type: ToolType; key: string }; pattern: string; reason: 'toolSkipped' };

export interface MergeReport {
  /** 新增的条目数。新增整个 Agent 时连同它的内置工具只算一个。 */
  added: number;
  /** 被跳过的预设条目，按标签、命令工具、MCP Server、Agent 与其内置工具、规则的顺序排列。 */
  skipped: MergeSkip[];
}

export interface MergeResult {
  workspace: Workspace;
  report: MergeReport;
}

interface KeyedEntry {
  id: string;
  key: string;
}

/**
 * 按内部 ID 挑出需要新增的预设条目。
 * 标识与已有条目（或先挑出的条目）相同的，交给 `onConflict` 记录并跳过。
 */
function pickMissing<T extends KeyedEntry>(existing: T[], preset: T[], onConflict: (entry: T) => void): T[] {
  const ids = new Set(existing.map((entry) => entry.id));
  const keys = new Set(existing.map((entry) => entry.key));
  const picked: T[] = [];
  for (const entry of preset) {
    if (ids.has(entry.id)) {
      continue;
    }
    if (keys.has(entry.key)) {
      onConflict(entry);
      continue;
    }
    keys.add(entry.key);
    picked.push(structuredClone(entry));
  }
  return picked;
}

function mergeKeyed<T extends KeyedEntry>(kind: KeyedKind, existing: T[], preset: T[], report: MergeReport): T[] {
  const added = pickMissing(existing, preset, ({ id, key }) =>
    report.skipped.push({ kind, id, key, reason: 'keyConflict' })
  );
  report.added += added.length;
  return added.length === 0 ? existing : [...existing, ...added];
}

/**
 * 合并 Agent：Agent 以名称作为标识。
 * 已有的 Agent 本身不变，只在末尾补上它缺少的预设内置工具；内置工具的标识只在所属 Agent 内比较。
 * 内置工具的内部 ID 在全部 Agent 中查找，已出现在任何 Agent 中的都视为已存在。
 */
function mergeAgents(existing: Agent[], preset: Agent[], report: MergeReport): Agent[] {
  const builtInIds = new Set(existing.flatMap((agent) => agent.built_in_tools.map((tool) => tool.id)));
  const names = new Set(existing.map((agent) => agent.name));
  const before = report.added;

  const merged = existing.map((agent) => {
    const incoming = preset.find((candidate) => candidate.id === agent.id);
    if (!incoming) {
      return agent;
    }
    const added = pickMissing(
      agent.built_in_tools,
      incoming.built_in_tools.filter((tool) => !builtInIds.has(tool.id)),
      ({ id, key }) =>
        report.skipped.push({ kind: 'built_in_tool', id, key, agentName: agent.name, reason: 'keyConflict' })
    );
    report.added += added.length;
    return added.length === 0 ? agent : { ...agent, built_in_tools: [...agent.built_in_tools, ...added] };
  });

  for (const agent of preset) {
    if (existing.some((candidate) => candidate.id === agent.id)) {
      continue;
    }
    if (names.has(agent.name)) {
      report.skipped.push({ kind: 'agent', id: agent.id, key: agent.name, reason: 'keyConflict' });
      continue;
    }
    names.add(agent.name);
    merged.push({
      ...structuredClone(agent),
      built_in_tools: structuredClone(agent.built_in_tools.filter((tool) => !builtInIds.has(tool.id))),
    });
    report.added += 1;
  }
  return report.added === before ? existing : merged;
}

/** 工具引用所指工具的标识；工具不存在时为 `null`。内置工具在全部 Agent 中查找。 */
function toolKey(workspace: Workspace, ref: ToolRef): string | null {
  const tools: KeyedEntry[] =
    ref.type === 'command'
      ? workspace.command_tools
      : ref.type === 'mcp'
        ? workspace.mcp_servers
        : workspace.agents.flatMap((agent) => agent.built_in_tools);
  return tools.find((tool) => tool.id === ref.id)?.key ?? null;
}

/** 合并规则：规则没有标识，只按内部 ID 判断；所指工具在合并后不存在的规则跳过，避免留下悬空规则。 */
function mergeRules(merged: Workspace, preset: Workspace, report: MergeReport): Rule[] {
  const ids = new Set(merged.rules.map((rule) => rule.id));
  const added: Rule[] = [];
  for (const rule of preset.rules) {
    if (ids.has(rule.id)) {
      continue;
    }
    if (toolKey(merged, rule.tool) === null) {
      report.skipped.push({
        kind: 'rule',
        id: rule.id,
        tool: { type: rule.tool.type, key: toolKey(preset, rule.tool) ?? '' },
        pattern: rule.pattern,
        reason: 'toolSkipped',
      });
      continue;
    }
    added.push(structuredClone(rule));
  }
  report.added += added.length;
  return added.length === 0 ? merged.rules : [...merged.rules, ...added];
}

/**
 * 合并预设：逐类（标签、命令工具、MCP Server、Agent 与其内置工具、规则）
 * 新增预设中有、工作区中没有（按内部 ID 判断）的条目，已有条目保持不变。
 * 标识与工作区已有条目冲突的预设条目跳过，并列在报告中。
 * 没有新增任何条目时原样返回工作区，修改时间不变。
 * `preset` 只供测试替换，界面使用默认的站点预设。
 */
export function mergePresets(
  workspace: Workspace,
  preset: Workspace = createPresetWorkspace(),
  ctx: OperationContext = systemContext
): MergeResult {
  const report: MergeReport = { added: 0, skipped: [] };
  const merged: Workspace = {
    ...workspace,
    tags: mergeKeyed('tag', workspace.tags, preset.tags, report),
    command_tools: mergeKeyed('command_tool', workspace.command_tools, preset.command_tools, report),
    mcp_servers: mergeKeyed('mcp_server', workspace.mcp_servers, preset.mcp_servers, report),
    agents: mergeAgents(workspace.agents, preset.agents, report),
  };
  merged.rules = mergeRules(merged, preset, report);
  if (report.added === 0) {
    return { workspace, report };
  }
  return { workspace: { ...merged, updated_at: ctx.now() }, report };
}

/**
 * 重置为预设：用站点预设整体替换当前工作区，不保留任何用户数据。
 * 修改时间取当前时间而不是预设的固定时间，同步时它才会被视为最新的修改。
 * 接收当前工作区只是为了与其他工作区操作的签名一致。
 */
export function resetToPresets(_workspace: Workspace, ctx: OperationContext = systemContext): { workspace: Workspace } {
  return { workspace: { ...createPresetWorkspace(), updated_at: ctx.now() } };
}
