import { type Draft, produce } from 'immer';

import type {
  Agent,
  BuiltInTool,
  CommandTool,
  Decision,
  JsonObject,
  McpOutput,
  McpServer,
  PermissionOutput,
  Rule,
  Scope,
  Tag,
  TemplatePair,
  ToolRef,
  ToolType,
  Workspace,
} from '@/lib/workspace';
import { TOOL_TYPES } from '@/lib/workspace';

/*
 * 工作区操作：对工作区做的所有修改，以及界面和生成共用的查询。
 * 每个修改接收旧工作区，返回新工作区或原因码，不修改传入的对象，也不抛异常。
 * 修改先检查输入，通过后在 Immer 的草稿上写入改动，未改动的部分与旧工作区共用；每次修改都更新 `updated_at`。
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
  | 'mcpPropertyPathInvalid'
  | 'decisionKeyDuplicate'
  | 'contentInvalid'
  | 'notFound'
  | 'toolMissing';

export type OperationResult = { workspace: Workspace } | { problem: OperationProblem };

/** 在旧工作区的草稿上执行 `recipe`，并更新 `updated_at`。 */
function commit(
  workspace: Workspace,
  recipe: (draft: Draft<Workspace>) => void,
  ctx: OperationContext
): OperationResult {
  return {
    workspace: produce(workspace, (draft) => {
      recipe(draft);
      draft.updated_at = ctx.now();
    }),
  };
}

/** 从草稿的列表中删除满足条件的条目。 */
function removeWhere<T>(list: T[], predicate: (item: T) => boolean): void {
  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (predicate(list[index]!)) {
      list.splice(index, 1);
    }
  }
}

/** 在草稿的列表中按内部 ID 查找条目。调用方已确认条目存在。 */
function byId<T extends { id: string }>(list: T[], id: string): T {
  return list.find((item) => item.id === id)!;
}

/* 标签 */

export interface TagInput {
  key: string;
  name: string;
}

/** 整理并检查标签表单的内容。标识在全部标签中唯一，名称不能为空。 */
function checkTagInput(
  workspace: Workspace,
  input: TagInput,
  selfId: string | null
): { problem: OperationProblem } | { fields: Omit<Tag, 'id'> } {
  const key = input.key.trim();
  const problem = checkKey(workspace.tags, key, selfId);
  if (problem) {
    return { problem };
  }
  const name = input.name.trim();
  if (name === '') {
    return { problem: 'nameEmpty' };
  }
  return { fields: { key, name } };
}

export function addTag(workspace: Workspace, input: TagInput, ctx: OperationContext = systemContext): OperationResult {
  const checked = checkTagInput(workspace, input, null);
  if ('problem' in checked) {
    return checked;
  }
  return commit(workspace, (draft) => void draft.tags.push({ id: ctx.newId(), ...checked.fields }), ctx);
}

/** 重命名标签：标识和名称都可以修改。工具按内部 ID 引用标签，不需要改动。 */
export function updateTag(
  workspace: Workspace,
  id: string,
  input: TagInput,
  ctx: OperationContext = systemContext
): OperationResult {
  if (!workspace.tags.some((tag) => tag.id === id)) {
    return { problem: 'notFound' };
  }
  const checked = checkTagInput(workspace, input, id);
  if ('problem' in checked) {
    return checked;
  }
  return commit(workspace, (draft) => void Object.assign(byId(draft.tags, id), checked.fields), ctx);
}

/** 删除标签。引用它的工具保持不变，残留的标签 ID 由界面显示为带警告符号的“已删除的标签”。 */
export function deleteTag(workspace: Workspace, id: string, ctx: OperationContext = systemContext): OperationResult {
  if (!workspace.tags.some((tag) => tag.id === id)) {
    return { problem: 'notFound' };
  }
  return commit(workspace, (draft) => removeWhere(draft.tags, (tag) => tag.id === id), ctx);
}

/**
 * 工具（命令工具、MCP Server、内置工具）表单中的标签，整体替换原有的标签列表。
 * 省略时新增为空列表、编辑时保持不变。不检查标签是否存在：编辑时保留的已删除标签照常写回。
 */
interface TagIdsInput {
  tag_ids?: readonly string[];
}

/** 表单给出的标签列表，重复的 ID 只保留第一次出现；省略时沿用 `current`。 */
function inputTagIds(input: TagIdsInput, current: string[]): string[] {
  return input.tag_ids ? [...new Set(input.tag_ids)] : current;
}

/** 全部工具（命令工具、MCP Server、各 Agent 的内置工具），用于按标签统计。 */
function allTools(workspace: Workspace): { tag_ids: string[] }[] {
  return [
    ...workspace.command_tools,
    ...workspace.mcp_servers,
    ...workspace.agents.flatMap((agent) => agent.built_in_tools),
  ];
}

/** 引用某个标签的工具数量。删除标签前，界面用它在确认框中提示。 */
export function countToolsForTag(workspace: Workspace, tagId: string): number {
  return allTools(workspace).filter((tool) => tool.tag_ids.includes(tagId)).length;
}

/** 工具上的一个标签引用。标签已被删除时 `tag` 为 `null`，界面显示为“已删除的标签”。 */
export interface TagRef {
  id: string;
  tag: Tag | null;
}

/** 按工具上的顺序解析标签引用。 */
export function resolveTags(workspace: Workspace, tagIds: readonly string[]): TagRef[] {
  return tagIds.map((id) => ({ id, tag: workspace.tags.find((tag) => tag.id === id) ?? null }));
}

/* 命令工具 */

/** 各类表单都可附带的高危标记。省略时新增为 `false`、编辑时保持不变。 */
interface HighRiskInput {
  high_risk?: boolean;
}

export interface CommandToolInput extends HighRiskInput, TagIdsInput {
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

export function addCommandTool(
  workspace: Workspace,
  input: CommandToolInput,
  ctx: OperationContext = systemContext
): OperationResult {
  const key = input.key.trim();
  const problem = checkKey(workspace.command_tools, key, null);
  if (problem) {
    return { problem };
  }
  const tool: CommandTool = {
    id: ctx.newId(),
    key,
    description: input.description.trim(),
    tag_ids: inputTagIds(input, []),
    high_risk: input.high_risk ?? false,
  };
  return commit(workspace, (draft) => void draft.command_tools.push(tool), ctx);
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
  const problem = checkKey(workspace.command_tools, key, id);
  if (problem) {
    return { problem };
  }
  return commit(
    workspace,
    (draft) => {
      const tool = byId(draft.command_tools, id);
      tool.key = key;
      tool.description = input.description.trim();
      tool.tag_ids = inputTagIds(input, tool.tag_ids);
      tool.high_risk = input.high_risk ?? tool.high_risk;
    },
    ctx
  );
}

function refersTo(rule: Rule, ref: ToolRef): boolean {
  return rule.tool.type === ref.type && rule.tool.id === ref.id;
}

/** 删除工具前，界面用它在确认框中显示受影响的规则数量。 */
export function countRulesForTool(workspace: Workspace, ref: ToolRef): number {
  return workspace.rules.filter((rule) => refersTo(rule, ref)).length;
}

/** 删除一个工具：`remove` 从草稿的清单中删除该工具，同时删除指向它的规则。 */
function deleteTool(
  workspace: Workspace,
  ref: ToolRef,
  remove: (draft: Draft<Workspace>) => void,
  ctx: OperationContext
): OperationResult {
  return commit(
    workspace,
    (draft) => {
      remove(draft);
      removeWhere(draft.rules, (rule) => refersTo(rule, ref));
    },
    ctx
  );
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
  return deleteTool(
    workspace,
    { type: 'command', id },
    (draft) => removeWhere(draft.command_tools, (tool) => tool.id === id),
    ctx
  );
}

/* MCP Server */

/** MCP Server 表单提交的内容。`content` 是用户输入的 JSON 文本，由操作负责解析。 */
export interface McpServerInput extends HighRiskInput, TagIdsInput {
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
  const server: McpServer = {
    id: ctx.newId(),
    ...checked.fields,
    tag_ids: inputTagIds(input, []),
    high_risk: input.high_risk ?? false,
  };
  return commit(workspace, (draft) => void draft.mcp_servers.push(server), ctx);
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
  return commit(
    workspace,
    (draft) => {
      const server = byId(draft.mcp_servers, id);
      Object.assign(server, checked.fields);
      server.tag_ids = inputTagIds(input, server.tag_ids);
      server.high_risk = input.high_risk ?? server.high_risk;
    },
    ctx
  );
}

/** 删除 MCP Server，同时删除指向它（即同名 MCP 工具）的规则。 */
export function deleteMcpServer(
  workspace: Workspace,
  id: string,
  ctx: OperationContext = systemContext
): OperationResult {
  if (!workspace.mcp_servers.some((server) => server.id === id)) {
    return { problem: 'notFound' };
  }
  return deleteTool(
    workspace,
    { type: 'mcp', id },
    (draft) => removeWhere(draft.mcp_servers, (server) => server.id === id),
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

/** 开启 MCP 输出时的初始值：主流 Agent 采用的 Claude 风格 `mcpServers` JSON。 */
export function newMcpOutput(): McpOutput {
  return { style: 'json', property_path: 'mcpServers', scopes: [] };
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
  // 两种输出的属性路径分别给出原因码，界面据此定位到出错的字段。
  if (permission_output && !isValidPropertyPath(permission_output.property_path)) {
    return { problem: 'propertyPathInvalid' };
  }
  if (mcp_output && !isValidPropertyPath(mcp_output.property_path)) {
    return { problem: 'mcpPropertyPathInvalid' };
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
  return commit(workspace, (draft) => void draft.agents.push(agent), ctx);
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
  return commit(workspace, (draft) => void Object.assign(byId(draft.agents, id), checked.fields), ctx);
}

/** 指向该 Agent 内置工具的规则，删除 Agent 时会一并删除。 */
function isAgentRule(agent: Agent, rule: Rule): boolean {
  return rule.tool.type === 'built_in' && agent.built_in_tools.some((tool) => tool.id === rule.tool.id);
}

/**
 * Agent 页和输出页共用的当前 Agent：选中的 Agent 存在时取它，
 * 未选择或已被删除时回到第一个 Agent；没有 Agent 时为 `undefined`。
 */
export function findSelectedAgent(workspace: Workspace, selectedId: string | null): Agent | undefined {
  return workspace.agents.find((agent) => agent.id === selectedId) ?? workspace.agents[0];
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
    (draft) => {
      removeWhere(draft.agents, (candidate) => candidate.id === id);
      removeWhere(draft.rules, (rule) => isAgentRule(agent, rule));
    },
    ctx
  );
}

/* 内置工具 */

/** 内置工具表单提交的内容。 */
export interface BuiltInToolInput extends HighRiskInput, TagIdsInput {
  key: string;
  description: string;
  writes: boolean;
  /** 模板中使用 `{pattern}`，如 `Read({pattern}**)` 与 `Read`。 */
  templates: TemplatePair;
}

/** 检查标识：去掉首尾空白后不能为空，也不能与同一 Agent 的其他内置工具重复。 */
function checkBuiltInToolKey(agent: Agent, key: string, selfId: string | null): OperationProblem | null {
  if (key === '') {
    return 'keyEmpty';
  }
  if (agent.built_in_tools.some((tool) => tool.key === key && tool.id !== selfId)) {
    return 'keyDuplicate';
  }
  return null;
}

/** 给某个 Agent 新增内置工具。标识只需在该 Agent 内唯一。 */
export function addBuiltInTool(
  workspace: Workspace,
  agentId: string,
  input: BuiltInToolInput,
  ctx: OperationContext = systemContext
): OperationResult {
  const agent = workspace.agents.find((candidate) => candidate.id === agentId);
  if (!agent) {
    return { problem: 'notFound' };
  }
  const key = input.key.trim();
  const problem = checkBuiltInToolKey(agent, key, null);
  if (problem) {
    return { problem };
  }
  const tool: BuiltInTool = {
    id: ctx.newId(),
    key,
    description: input.description.trim(),
    tag_ids: inputTagIds(input, []),
    high_risk: input.high_risk ?? false,
    writes: input.writes,
    templates: trimTemplates(input.templates),
  };
  return commit(workspace, (draft) => void byId(draft.agents, agentId).built_in_tools.push(tool), ctx);
}

/** 编辑内置工具。所属 Agent 不变，指向它的规则随之输出新的模板。 */
export function updateBuiltInTool(
  workspace: Workspace,
  id: string,
  input: BuiltInToolInput,
  ctx: OperationContext = systemContext
): OperationResult {
  const found = findBuiltInTool(workspace, id);
  if (!found) {
    return { problem: 'notFound' };
  }
  const key = input.key.trim();
  const problem = checkBuiltInToolKey(found.agent, key, id);
  if (problem) {
    return { problem };
  }
  return commit(
    workspace,
    (draft) => {
      const tool = byId(byId(draft.agents, found.agent.id).built_in_tools, id);
      tool.key = key;
      tool.description = input.description.trim();
      tool.tag_ids = inputTagIds(input, tool.tag_ids);
      tool.high_risk = input.high_risk ?? tool.high_risk;
      tool.writes = input.writes;
      tool.templates = trimTemplates(input.templates);
    },
    ctx
  );
}

/** 删除内置工具，同时删除指向它的规则。受影响的规则数量用 `countRulesForTool` 查询。 */
export function deleteBuiltInTool(
  workspace: Workspace,
  id: string,
  ctx: OperationContext = systemContext
): OperationResult {
  const found = findBuiltInTool(workspace, id);
  if (!found) {
    return { problem: 'notFound' };
  }
  return deleteTool(
    workspace,
    { type: 'built_in', id },
    (draft) => removeWhere(byId(draft.agents, found.agent.id).built_in_tools, (tool) => tool.id === id),
    ctx
  );
}

/** 在全部 Agent 的内置工具中按内部 ID 查找，同时返回所属的 Agent。 */
export function findBuiltInTool(workspace: Workspace, id: string): Extract<ResolvedTool, { type: 'built_in' }> | null {
  for (const agent of workspace.agents) {
    const tool = agent.built_in_tools.find((candidate) => candidate.id === id);
    if (tool) {
      return { type: 'built_in', tool, agent };
    }
  }
  return null;
}

/* 权限规则 */

export interface RuleInput extends HighRiskInput {
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
    high_risk: input.high_risk ?? false,
  };
  return commit(workspace, (draft) => void draft.rules.push(rule), ctx);
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
  return commit(
    workspace,
    (draft) => {
      const rule = byId(draft.rules, id);
      rule.tool = { ...input.tool };
      rule.pattern = input.pattern.trim();
      rule.decision = input.decision;
      rule.high_risk = input.high_risk ?? rule.high_risk;
    },
    ctx
  );
}

export function deleteRule(workspace: Workspace, id: string, ctx: OperationContext = systemContext): OperationResult {
  if (!workspace.rules.some((rule) => rule.id === id)) {
    return { problem: 'notFound' };
  }
  return commit(workspace, (draft) => removeWhere(draft.rules, (rule) => rule.id === id), ctx);
}

/* 查询 */

/**
 * 规则指向的工具。工具已被删除时解析不到。MCP 工具解析为它所对应的 MCP Server。
 * 内置工具同时带上所属的 Agent：指向它的规则只属于这个 Agent。
 */
export type ResolvedTool =
  | { type: 'command'; tool: CommandTool }
  | { type: 'mcp'; tool: McpServer }
  | { type: 'built_in'; tool: BuiltInTool; agent: Agent };

export function resolveTool(workspace: Workspace, ref: ToolRef): ResolvedTool | null {
  if (ref.type === 'command') {
    const tool = workspace.command_tools.find((candidate) => candidate.id === ref.id);
    return tool ? { type: 'command', tool } : null;
  }
  if (ref.type === 'mcp') {
    const tool = workspace.mcp_servers.find((candidate) => candidate.id === ref.id);
    return tool ? { type: 'mcp', tool } : null;
  }
  if (ref.type === 'built_in') {
    return findBuiltInTool(workspace, ref.id);
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

/* 筛选 */

/** 工具列表的筛选条件：名称关键字为空、标签为 `null` 表示不限。 */
export interface ToolFilter {
  name: string;
  tagId: string | null;
}

export const NO_TOOL_FILTER: ToolFilter = { name: '', tagId: null };

/** 名称关键字去掉首尾空白后不区分大小写地匹配标识或描述；标签条件与它同时生效。 */
export function matchesToolFilter(
  tool: { key: string; description: string; tag_ids: string[] },
  filter: ToolFilter
): boolean {
  if (filter.tagId !== null && !tool.tag_ids.includes(filter.tagId)) {
    return false;
  }
  const keyword = filter.name.trim().toLowerCase();
  return keyword === '' || tool.key.toLowerCase().includes(keyword) || tool.description.toLowerCase().includes(keyword);
}

/** 规则列表的筛选条件，取值 `null` 表示不限。归属筛选由界面另行组合。 */
export interface RuleFilter {
  /** 规则所指工具带有这个标签。 */
  tagId: string | null;
  decision: Decision | null;
  toolType: ToolType | null;
}

export const NO_RULE_FILTER: RuleFilter = { tagId: null, decision: null, toolType: null };

/** 规则是否同时满足全部筛选条件。 */
export function matchesRuleFilter({ rule, tool }: RuleListItem, filter: RuleFilter): boolean {
  return (
    (filter.tagId === null || tool.tool.tag_ids.includes(filter.tagId)) &&
    (filter.decision === null || rule.decision === filter.decision) &&
    (filter.toolType === null || tool.type === filter.toolType)
  );
}
