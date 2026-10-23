import type { CommandTool, Decision, Rule, ToolRef, Workspace } from '@/lib/workspace';
import { TOOL_TYPES } from '@/lib/workspace';

/*
 * 工作区操作：对工作区做的所有修改，以及界面和生成共用的查询。
 * 每个修改接收旧工作区，返回新工作区或原因码，不修改传入的对象，也不抛异常。
 * 每次修改都更新 `updated_at`。
 */

/** 修改所需的外部输入：当前时间和新的内部 ID。测试时注入固定值。 */
export interface OperationContext {
  now: () => string;
  newId: () => string;
}

export const systemContext: OperationContext = {
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
};

export type OperationProblem = 'keyEmpty' | 'keyDuplicate' | 'notFound' | 'toolMissing';

export type OperationResult = { workspace: Workspace } | { problem: OperationProblem };

function commit(workspace: Workspace, changes: Partial<Workspace>, ctx: OperationContext): OperationResult {
  return { workspace: { ...workspace, ...changes, updated_at: ctx.now() } };
}

/* 命令工具 */

export interface CommandToolInput {
  key: string;
  description: string;
}

/** 检查标识：去掉首尾空白后不能为空，也不能与其他命令工具重复。 */
function checkCommandToolKey(workspace: Workspace, key: string, selfId: string | null): OperationProblem | null {
  if (key === '') {
    return 'keyEmpty';
  }
  if (workspace.command_tools.some((tool) => tool.key === key && tool.id !== selfId)) {
    return 'keyDuplicate';
  }
  return null;
}

export function addCommandTool(
  workspace: Workspace,
  input: CommandToolInput,
  ctx: OperationContext = systemContext
): OperationResult {
  const key = input.key.trim();
  const problem = checkCommandToolKey(workspace, key, null);
  if (problem) {
    return { problem };
  }
  const tool: CommandTool = {
    id: ctx.newId(),
    key,
    description: input.description.trim(),
    tag_ids: [],
    high_risk: false,
  };
  return commit(workspace, { command_tools: [...workspace.command_tools, tool] }, ctx);
}

export function updateCommandTool(
  workspace: Workspace,
  id: string,
  input: CommandToolInput,
  ctx: OperationContext = systemContext
): OperationResult {
  if (!workspace.command_tools.some((tool) => tool.id === id)) {
    return { problem: 'notFound' };
  }
  const key = input.key.trim();
  const problem = checkCommandToolKey(workspace, key, id);
  if (problem) {
    return { problem };
  }
  const command_tools = workspace.command_tools.map((tool) =>
    tool.id === id ? { ...tool, key, description: input.description.trim() } : tool
  );
  return commit(workspace, { command_tools }, ctx);
}

function refersTo(rule: Rule, ref: ToolRef): boolean {
  return rule.tool.type === ref.type && rule.tool.id === ref.id;
}

/** 删除工具前，界面用它在确认框中显示受影响的规则数量。 */
export function countRulesForTool(workspace: Workspace, ref: ToolRef): number {
  return workspace.rules.filter((rule) => refersTo(rule, ref)).length;
}

/** 删除命令工具，同时删除指向它的规则。 */
export function deleteCommandTool(
  workspace: Workspace,
  id: string,
  ctx: OperationContext = systemContext
): OperationResult {
  if (!workspace.command_tools.some((tool) => tool.id === id)) {
    return { problem: 'notFound' };
  }
  const ref: ToolRef = { type: 'command', id };
  return commit(
    workspace,
    {
      command_tools: workspace.command_tools.filter((tool) => tool.id !== id),
      rules: workspace.rules.filter((rule) => !refersTo(rule, ref)),
    },
    ctx
  );
}

/* 权限规则 */

export interface RuleInput {
  tool: ToolRef;
  pattern: string;
  decision: Decision;
}

export function addRule(
  workspace: Workspace,
  input: RuleInput,
  ctx: OperationContext = systemContext
): OperationResult {
  if (!resolveTool(workspace, input.tool)) {
    return { problem: 'toolMissing' };
  }
  const rule: Rule = {
    id: ctx.newId(),
    tool: { ...input.tool },
    pattern: input.pattern.trim(),
    decision: input.decision,
    high_risk: false,
  };
  return commit(workspace, { rules: [...workspace.rules, rule] }, ctx);
}

export function updateRule(
  workspace: Workspace,
  id: string,
  input: RuleInput,
  ctx: OperationContext = systemContext
): OperationResult {
  if (!workspace.rules.some((rule) => rule.id === id)) {
    return { problem: 'notFound' };
  }
  if (!resolveTool(workspace, input.tool)) {
    return { problem: 'toolMissing' };
  }
  const rules = workspace.rules.map((rule) =>
    rule.id === id
      ? { ...rule, tool: { ...input.tool }, pattern: input.pattern.trim(), decision: input.decision }
      : rule
  );
  return commit(workspace, { rules }, ctx);
}

export function deleteRule(workspace: Workspace, id: string, ctx: OperationContext = systemContext): OperationResult {
  if (!workspace.rules.some((rule) => rule.id === id)) {
    return { problem: 'notFound' };
  }
  return commit(workspace, { rules: workspace.rules.filter((rule) => rule.id !== id) }, ctx);
}

/* 查询 */

/** 规则指向的工具。工具已被删除时解析不到。 */
export type ResolvedTool = { type: 'command'; tool: CommandTool };

export function resolveTool(workspace: Workspace, ref: ToolRef): ResolvedTool | null {
  if (ref.type === 'command') {
    const tool = workspace.command_tools.find((candidate) => candidate.id === ref.id);
    return tool ? { type: 'command', tool } : null;
  }
  return null;
}

export interface RuleListItem {
  rule: Rule;
  tool: ResolvedTool;
}

/** 按码位比较，保证不同设备、不同语言环境下排序一致。 */
function compareText(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/**
 * 规则列表：按工具类型、工具标识、模式自动排序，输出顺序与它一致。
 * 指向不存在工具的规则不出现在列表中。
 */
export function listRules(workspace: Workspace): RuleListItem[] {
  const items: RuleListItem[] = [];
  for (const rule of workspace.rules) {
    const tool = resolveTool(workspace, rule.tool);
    if (tool) {
      items.push({ rule, tool });
    }
  }
  return items.sort(
    (a, b) =>
      TOOL_TYPES.indexOf(a.tool.type) - TOOL_TYPES.indexOf(b.tool.type) ||
      compareText(a.tool.tool.key, b.tool.tool.key) ||
      compareText(a.rule.pattern, b.rule.pattern)
  );
}
