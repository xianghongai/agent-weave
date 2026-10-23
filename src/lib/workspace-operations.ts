import type {
  Agent,
  CommandTool,
  Decision,
  JsonObject,
  McpOutput,
  McpServer,
  PermissionOutput,
  Rule,
  Scope,
  TemplatePair,
  ToolRef,
  Workspace,
} from '@/lib/workspace';
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

export type OperationProblem =
  | 'keyEmpty'
  | 'keyDuplicate'
  | 'nameEmpty'
  | 'nameDuplicate'
  | 'propertyPathInvalid'
  | 'decisionKeyDuplicate'
  | 'contentInvalid'
  | 'notFound'
  | 'toolMissing';

export type OperationResult = { workspace: Workspace } | { problem: OperationProblem };

function commit(workspace: Workspace, changes: Partial<Workspace>, ctx: OperationContext): OperationResult {
  return { workspace: { ...workspace, ...changes, updated_at: ctx.now() } };
}

/* 命令工具 */

export interface CommandToolInput {
  key: string;
  description: string;
}

/** 检查标识：去掉首尾空白后不能为空，也不能与同一类的其他条目重复。 */
function checkKey(entries: { id: string; key: string }[], key: string, selfId: string | null): OperationProblem | null {
  if (key === '') {
    return 'keyEmpty';
  }
  if (entries.some((entry) => entry.key === key && entry.id !== selfId)) {
    return 'keyDuplicate';
  }
  return null;
}

function checkCommandToolKey(workspace: Workspace, key: string, selfId: string | null): OperationProblem | null {
  return checkKey(workspace.command_tools, key, selfId);
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

/* MCP Server */

/** MCP Server 表单提交的内容。`content` 是用户输入的 JSON 文本，由操作负责解析。 */
export interface McpServerInput {
  key: string;
  content: string;
  description: string;
}

/** 把内容解析成 JSON 对象。只校验是不是 JSON 对象，不校验其中的字段。 */
function parseMcpContent(text: string): JsonObject | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonObject) : null;
}

/** 整理并检查 MCP Server 表单的内容，返回要写入的字段。 */
function checkMcpServerInput(
  workspace: Workspace,
  input: McpServerInput,
  selfId: string | null
): { problem: OperationProblem } | { fields: Pick<McpServer, 'key' | 'content' | 'description'> } {
  const key = input.key.trim();
  const problem = checkKey(workspace.mcp_servers, key, selfId);
  if (problem) {
    return { problem };
  }
  const content = parseMcpContent(input.content);
  if (!content) {
    return { problem: 'contentInvalid' };
  }
  return { fields: { key, content, description: input.description.trim() } };
}

export function addMcpServer(
  workspace: Workspace,
  input: McpServerInput,
  ctx: OperationContext = systemContext
): OperationResult {
  const checked = checkMcpServerInput(workspace, input, null);
  if ('problem' in checked) {
    return checked;
  }
  const server: McpServer = { id: ctx.newId(), ...checked.fields, tag_ids: [], high_risk: false };
  return commit(workspace, { mcp_servers: [...workspace.mcp_servers, server] }, ctx);
}

export function updateMcpServer(
  workspace: Workspace,
  id: string,
  input: McpServerInput,
  ctx: OperationContext = systemContext
): OperationResult {
  if (!workspace.mcp_servers.some((server) => server.id === id)) {
    return { problem: 'notFound' };
  }
  const checked = checkMcpServerInput(workspace, input, id);
  if ('problem' in checked) {
    return checked;
  }
  const mcp_servers = workspace.mcp_servers.map((server) =>
    server.id === id ? { ...server, ...checked.fields } : server
  );
  return commit(workspace, { mcp_servers }, ctx);
}

/** 删除 MCP Server，同时删除指向它（即同名 MCP 工具）的规则。 */
export function deleteMcpServer(workspace: Workspace, id: string, ctx: OperationContext = systemContext): OperationResult {
  if (!workspace.mcp_servers.some((server) => server.id === id)) {
    return { problem: 'notFound' };
  }
  const ref: ToolRef = { type: 'mcp', id };
  return commit(
    workspace,
    {
      mcp_servers: workspace.mcp_servers.filter((server) => server.id !== id),
      rules: workspace.rules.filter((rule) => !refersTo(rule, ref)),
    },
    ctx
  );
}

/* Agent */

/**
 * Agent 表单提交的内容。内置工具单独增删改，不经过这里，编辑 Agent 时保持不变。
 * MCP 输出与权限输出一样整体传入，为 `null` 表示该 Agent 不输出这一部分。
 */
export interface AgentInput {
  name: string;
  description: string;
  permission_output: PermissionOutput | null;
  mcp_output: McpOutput | null;
}

/** 新增 Agent 或开启权限输出时的初始值：决策键名映射默认为 `allow`、`ask`、`deny`，模板留空待填。 */
export function newPermissionOutput(): PermissionOutput {
  return {
    property_path: 'permissions',
    scopes: [],
    decision_keys: { allow: 'allow', ask: 'ask', deny: 'deny' },
    command_templates: { with_pattern: '', without_pattern: '' },
    mcp_templates: { with_pattern: '', without_pattern: '' },
  };
}

function trimTemplates(pair: TemplatePair): TemplatePair {
  return { with_pattern: pair.with_pattern.trim(), without_pattern: pair.without_pattern.trim() };
}

/** 去掉作用域各字段首尾的空白，丢弃全部为空的作用域（表单中新增后未填写的行）。 */
function trimScopes(scopes: Scope[]): Scope[] {
  return scopes
    .map((scope) => ({ name: scope.name.trim(), path: scope.path.trim(), note: scope.note.trim() }))
    .filter((scope) => scope.name !== '' || scope.path !== '' || scope.note !== '');
}

/** 点分的属性路径：至少一段，且每一段都不为空。 */
function isValidPropertyPath(path: string): boolean {
  return path.split('.').every((segment) => segment !== '');
}

function normalizePermissionOutput(output: PermissionOutput): PermissionOutput {
  return {
    property_path: output.property_path.trim(),
    scopes: trimScopes(output.scopes),
    decision_keys: {
      allow: output.decision_keys.allow.trim(),
      ask: output.decision_keys.ask.trim(),
      deny: output.decision_keys.deny.trim(),
    },
    command_templates: trimTemplates(output.command_templates),
    mcp_templates: trimTemplates(output.mcp_templates),
  };
}

function normalizeMcpOutput(output: McpOutput): McpOutput {
  return { style: output.style, property_path: output.property_path.trim(), scopes: trimScopes(output.scopes) };
}

/** 整理并检查 Agent 表单的内容。名称在全部 Agent 中唯一。 */
function checkAgentInput(
  workspace: Workspace,
  input: AgentInput,
  selfId: string | null
): { problem: OperationProblem } | { fields: Omit<Agent, 'id' | 'built_in_tools'> } {
  const name = input.name.trim();
  if (name === '') {
    return { problem: 'nameEmpty' };
  }
  if (workspace.agents.some((agent) => agent.name === name && agent.id !== selfId)) {
    return { problem: 'nameDuplicate' };
  }

  const permission_output = input.permission_output && normalizePermissionOutput(input.permission_output);
  const mcp_output = input.mcp_output && normalizeMcpOutput(input.mcp_output);
  for (const output of [permission_output, mcp_output]) {
    if (output && !isValidPropertyPath(output.property_path)) {
      return { problem: 'propertyPathInvalid' };
    }
  }
  if (permission_output) {
    // 同一个键名出现两次时，JSON 中后一个决策会覆盖前一个；留空的决策不输出，不算重复。
    const keys = Object.values(permission_output.decision_keys).filter((key) => key !== '');
    if (new Set(keys).size !== keys.length) {
      return { problem: 'decisionKeyDuplicate' };
    }
  }

  return { fields: { name, description: input.description.trim(), permission_output, mcp_output } };
}

export function addAgent(
  workspace: Workspace,
  input: AgentInput,
  ctx: OperationContext = systemContext
): OperationResult {
  const checked = checkAgentInput(workspace, input, null);
  if ('problem' in checked) {
    return checked;
  }
  const agent: Agent = { id: ctx.newId(), ...checked.fields, built_in_tools: [] };
  return commit(workspace, { agents: [...workspace.agents, agent] }, ctx);
}

export function updateAgent(
  workspace: Workspace,
  id: string,
  input: AgentInput,
  ctx: OperationContext = systemContext
): OperationResult {
  if (!workspace.agents.some((agent) => agent.id === id)) {
    return { problem: 'notFound' };
  }
  const checked = checkAgentInput(workspace, input, id);
  if ('problem' in checked) {
    return checked;
  }
  const agents = workspace.agents.map((agent) => (agent.id === id ? { ...agent, ...checked.fields } : agent));
  return commit(workspace, { agents }, ctx);
}

/** 指向该 Agent 内置工具的规则，删除 Agent 时会一并删除。 */
function isAgentRule(agent: Agent, rule: Rule): boolean {
  return rule.tool.type === 'built_in' && agent.built_in_tools.some((tool) => tool.id === rule.tool.id);
}

/** 删除 Agent 前，界面用它在确认框中显示受影响的规则数量。 */
export function countRulesForAgent(workspace: Workspace, agentId: string): number {
  const agent = workspace.agents.find((candidate) => candidate.id === agentId);
  return agent ? workspace.rules.filter((rule) => isAgentRule(agent, rule)).length : 0;
}

/** 删除 Agent，同时删除它的内置工具，以及指向这些内置工具的规则。 */
export function deleteAgent(workspace: Workspace, id: string, ctx: OperationContext = systemContext): OperationResult {
  const agent = workspace.agents.find((candidate) => candidate.id === id);
  if (!agent) {
    return { problem: 'notFound' };
  }
  return commit(
    workspace,
    {
      agents: workspace.agents.filter((candidate) => candidate.id !== id),
      rules: workspace.rules.filter((rule) => !isAgentRule(agent, rule)),
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

/** 规则指向的工具。工具已被删除时解析不到。MCP 工具即 MCP Server 本身。 */
export type ResolvedTool = { type: 'command'; tool: CommandTool } | { type: 'mcp'; tool: McpServer };

export function resolveTool(workspace: Workspace, ref: ToolRef): ResolvedTool | null {
  if (ref.type === 'command') {
    const tool = workspace.command_tools.find((candidate) => candidate.id === ref.id);
    return tool ? { type: 'command', tool } : null;
  }
  if (ref.type === 'mcp') {
    const tool = workspace.mcp_servers.find((candidate) => candidate.id === ref.id);
    return tool ? { type: 'mcp', tool } : null;
  }
  return null;
}

export interface RuleListItem {
  rule: Rule;
  tool: ResolvedTool;
}

/** 按码位比较，保证不同设备、不同语言环境下排序一致。 */
export function compareText(a: string, b: string): number {
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
