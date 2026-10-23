import type {
  Decision,
  DeviceSettings,
  JsonValue,
  McpOutput,
  McpServer,
  McpStyle,
  PermissionOutput,
  Rule,
  Scope,
  TemplatePair,
  Workspace,
} from '@/lib/workspace';
import { expandContent, expandText } from '@/lib/placeholders';
import { DECISIONS } from '@/lib/workspace';
import { type ResolvedTool, compareText, listRules } from '@/lib/workspace-operations';

/*
 * 生成：输入工作区、Agent 的内部 ID 和本机设置，返回该 Agent 的完整输出结果。
 * 界面只负责展示这里的结果；模板代入、去重、排序等都是内部实现，不单独暴露。
 */

/** 权限节中一个决策的输出。 */
export interface DecisionOutput {
  decision: Decision;
  /** 该决策在输出中的键名，来自 Agent 定义的决策键名映射。 */
  key: string;
  /** 已代入模板并去重的条目，顺序与规则列表一致。 */
  entries: string[];
  /** “复制内部”文本：数组元素以逗号和换行分隔，不带方括号。 */
  copyInnerText: string;
}

export interface PermissionSection {
  /** 按属性路径完整嵌套的 JSON。 */
  preview: string;
  /** “复制”文本：属性路径最末一段的键值对，不带外层花括号。 */
  copyText: string;
  /** 只包含该 Agent 支持的决策，按 `allow`、`ask`、`deny` 排列。 */
  decisions: DecisionOutput[];
  scopes: Scope[];
}

export interface McpSection {
  style: McpStyle;
  preview: string;
  copyText: string;
  /** 只有 JSON 风格提供“复制内部”。 */
  copyInnerText: string | null;
  scopes: Scope[];
}

export type SkipReason = 'decisionKeyMissing' | 'templateMissing';

/** 跳过的规则：该 Agent 定义表达不了、因而没有写进输出的权限规则。 */
export interface SkippedRule {
  ruleId: string;
  reason: SkipReason;
}

export type Notice =
  | { type: 'highRisk'; ruleId: string }
  | { type: 'conflict'; ruleIds: string[] }
  | { type: 'placeholderUnexpanded'; ruleId: string | null; serverId: string | null }
  | { type: 'tomlFieldSkipped'; serverId: string; field: string };

export interface AgentOutput {
  /** 为 `null` 时该 Agent 不输出权限。 */
  permission: PermissionSection | null;
  /** 为 `null` 时该 Agent 不输出 MCP 配置。 */
  mcp: McpSection | null;
  skippedRules: SkippedRule[];
  notices: Notice[];
}

type TemplateValues = Partial<Record<'command' | 'server' | 'pattern', string>>;

/**
 * 一次性替换模板中的 `{command}`、`{server}`、`{pattern}`。
 * 代入的值不会再被扫描，因此模式中的 `*` 或花括号都原样保留。
 */
function fillTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\{(command|server|pattern)\}/g, (placeholder, name: keyof TemplateValues) => {
    return values[name] ?? placeholder;
  });
}

const INDENT = 2;

/** 一个不带外层花括号的 JSON 键值对，如 `"permissions": {...}`。 */
function jsonPair(key: string, value: JsonValue): string {
  return `${JSON.stringify(key)}: ${JSON.stringify(value, null, INDENT)}`;
}

/** 把值按点分属性路径层层嵌套，返回完整预览和最末一段的键值对。 */
function nestedJson(propertyPath: string, value: JsonValue): { preview: string; copyText: string } {
  const segments = propertyPath.split('.');
  const lastKey = segments.at(-1) ?? '';
  const nested = segments.reduceRight<JsonValue>((inner, segment) => ({ [segment]: inner }), value);
  return { preview: JSON.stringify(nested, null, INDENT), copyText: jsonPair(lastKey, value) };
}

/**
 * 一条规则所用的模板对和代入值，由工具类型决定。
 * 新的工具类型在这里加一个分支，其余的选模板、跳过判定、去重都不用改。
 */
function templatesFor(tool: ResolvedTool, output: PermissionOutput): { pair: TemplatePair; values: TemplateValues } {
  switch (tool.type) {
    case 'command':
      return { pair: output.command_templates, values: { command: tool.tool.key } };
    case 'mcp':
      return { pair: output.mcp_templates, values: { server: tool.tool.key } };
    case 'built_in':
      // 内置工具的模板属于工具本身，只代入模式；路径的 glob 由模板补全。
      return { pair: tool.tool.templates, values: {} };
  }
}

/**
 * 把一条规则写成输出中的字符串；该 Agent 表达不了时返回跳过原因。
 * 模式中的路径占位符先展开再代入模板；`unexpanded` 表示本机设置不完整、占位符原样保留。
 */
function ruleEntry(
  rule: Rule,
  tool: ResolvedTool,
  output: PermissionOutput,
  device: DeviceSettings
): { entry: string; unexpanded: boolean } | { skip: SkipReason } {
  // 决策键名为空表示该 Agent 不支持这一档，先于模板判定。
  if (output.decision_keys[rule.decision] === '') {
    return { skip: 'decisionKeyMissing' };
  }
  const { pair, values } = templatesFor(tool, output);
  const template = rule.pattern === '' ? pair.without_pattern : pair.with_pattern;
  if (template === '') {
    return { skip: 'templateMissing' };
  }
  const pattern = expandText(rule.pattern, device);
  return { entry: fillTemplate(template, { ...values, pattern: pattern.value }), unexpanded: pattern.unexpanded };
}

function permissionSection(
  workspace: Workspace,
  agentId: string,
  output: PermissionOutput,
  device: DeviceSettings
): { section: PermissionSection; skippedRules: SkippedRule[]; notices: Notice[] } {
  const skippedRules: SkippedRule[] = [];
  const notices: Notice[] = [];
  // Set 保持插入顺序，因此去重后仍与规则列表的顺序一致。
  const entries = new Map<Decision, Set<string>>(DECISIONS.map((decision) => [decision, new Set()]));

  for (const { rule, tool } of listRules(workspace)) {
    // 指向内置工具的规则只属于该内置工具所在的 Agent，其他 Agent 既不输出也不算跳过。
    if (tool.type === 'built_in' && tool.agent.id !== agentId) {
      continue;
    }
    const result = ruleEntry(rule, tool, output, device);
    if ('skip' in result) {
      skippedRules.push({ ruleId: rule.id, reason: result.skip });
      continue;
    }
    entries.get(rule.decision)?.add(result.entry);
    if (result.unexpanded) {
      notices.push({ type: 'placeholderUnexpanded', ruleId: rule.id, serverId: null });
    }
  }

  const decisions: DecisionOutput[] = DECISIONS.filter((decision) => output.decision_keys[decision] !== '').map(
    (decision) => {
      const list = [...(entries.get(decision) ?? [])];
      return {
        decision,
        key: output.decision_keys[decision],
        entries: list,
        copyInnerText: list.map((entry) => JSON.stringify(entry)).join(',\n'),
      };
    }
  );

  const body = Object.fromEntries(decisions.map(({ key, entries: list }) => [key, list]));
  return {
    section: { ...nestedJson(output.property_path, body), decisions, scopes: output.scopes },
    skippedRules,
    notices,
  };
}

/** JSON 风格：Server 标识到内容的对象。“复制内部”是各 Server 的键值对，以逗号和换行分隔。 */
function jsonMcpSection(servers: McpServer[], output: McpOutput): McpSection {
  const body = Object.fromEntries(servers.map((server) => [server.key, server.content]));
  return {
    style: 'json',
    ...nestedJson(output.property_path, body),
    copyInnerText: servers.map((server) => jsonPair(server.key, server.content)).join(',\n'),
    scopes: output.scopes,
  };
}

/**
 * MCP 节：包含全部 MCP Server，按标识排序；描述不进入输出，内容中的 `${VAR}` 原样保留。
 * 每种风格一个分支，共用 Server 的选取与排序。
 */
function mcpSection(workspace: Workspace, output: McpOutput): McpSection | null {
  const servers = workspace.mcp_servers.toSorted((a, b) => compareText(a.key, b.key));
  switch (output.style) {
    case 'json':
      return jsonMcpSection(servers, output);
    case 'toml':
      // TOML 风格由 JSON 内容转换而来，随 Codex CLI 一起实现，在此之前不输出。
      return null;
  }
}

/**
 * MCP 输出：先展开各 Server 内容中的路径占位符，再按风格格式化。
 * 未能展开的 Server 各产生一条提示，按标识排序，与输出顺序一致。
 */
function mcpOutput(
  workspace: Workspace,
  output: McpOutput,
  device: DeviceSettings
): { section: McpSection | null; notices: Notice[] } {
  const expanded = workspace.mcp_servers.map((server) => {
    const content = expandContent(server.content, device);
    return { server: { ...server, content: content.value }, unexpanded: content.unexpanded };
  });
  const notices = expanded
    .filter(({ unexpanded }) => unexpanded)
    .toSorted((a, b) => compareText(a.server.key, b.server.key))
    .map(({ server }): Notice => ({ type: 'placeholderUnexpanded', ruleId: null, serverId: server.id }));
  const section = mcpSection({ ...workspace, mcp_servers: expanded.map(({ server }) => server) }, output);
  return { section, notices };
}

/** 找不到该 Agent 时返回 `null`。 */
export function generate(workspace: Workspace, agentId: string, device: DeviceSettings): AgentOutput | null {
  const agent = workspace.agents.find((candidate) => candidate.id === agentId);
  if (!agent) {
    return null;
  }
  // 没有权限输出的 Agent 不产生跳过的规则，界面只说明“不输出权限”。
  const permission = agent.permission_output
    ? permissionSection(workspace, agent.id, agent.permission_output, device)
    : null;
  // 没有 MCP 输出的 Agent 不用到 Server 内容，也就不提示其中的占位符。
  const mcp = agent.mcp_output ? mcpOutput(workspace, agent.mcp_output, device) : null;
  return {
    permission: permission?.section ?? null,
    mcp: mcp?.section ?? null,
    skippedRules: permission?.skippedRules ?? [],
    notices: [...(permission?.notices ?? []), ...(mcp?.notices ?? [])],
  };
}
