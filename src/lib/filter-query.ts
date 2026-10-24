/*
 * 列表筛选条件与 URL 查询串互转。筛选条件放在当前页面的查询串中，
 * 刷新、前进后退、从其他页面带着条件跳转过来都是同一种来源，见 `docs/adr/0003-react-router-filter-query.md`。
 * 取默认值的条件不写进查询串；读回时取值无效或指向已删除的条目，只忽略这一个条件。
 */

import { DECISIONS, TOOL_TYPES, type ToolRef, type Workspace } from '@/lib/workspace';
import {
  NO_TOOL_FILTER,
  type RuleFilter,
  type RuleOwner,
  type ToolFilter,
  agentOwner,
  resolveTool,
} from '@/lib/workspace-operations';

/** 只保留非空的条件，按传入顺序写入。 */
function toQuery(entries: [key: string, value: string | null][]): URLSearchParams {
  const query = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value) {
      query.set(key, value);
    }
  }
  return query;
}

function existingTagId(workspace: Workspace, tagId: string | null): string | null {
  return workspace.tags.some((tag) => tag.id === tagId) ? tagId : null;
}

/** 在 `options` 中找到与 `value` 相同的取值，借此把字符串收窄成对应的字面量类型。 */
function pick<T extends string>(options: readonly T[], value: string | null): T | null {
  return options.find((option) => option === value) ?? null;
}

export function toolFilterToQuery(filter: ToolFilter): URLSearchParams {
  return toQuery([
    ['name', filter.name],
    ['tag', filter.tagId],
    ['highRisk', filter.highRisk ? '1' : null],
  ]);
}

export function toolFilterFromQuery(workspace: Workspace, query: URLSearchParams): ToolFilter {
  return {
    name: query.get('name') ?? NO_TOOL_FILTER.name,
    tagId: existingTagId(workspace, query.get('tag')),
    highRisk: query.get('highRisk') === '1',
  };
}

/** 工具写成 `类型:ID`，同一 ID 的命令工具与 MCP 工具靠类型区分。 */
function formatToolRef(tool: ToolRef | null): string | null {
  return tool && `${tool.type}:${tool.id}`;
}

function parseToolRef(workspace: Workspace, value: string | null): ToolRef | null {
  if (!value) {
    return null;
  }
  const separator = value.indexOf(':');
  if (separator < 0) {
    return null;
  }
  const type = pick(TOOL_TYPES, value.slice(0, separator));
  const tool = type && { type, id: value.slice(separator + 1) };
  return tool && resolveTool(workspace, tool) ? tool : null;
}

function parseOwner(workspace: Workspace, value: string | null): RuleOwner | null {
  if (value === 'shared') {
    return value;
  }
  const agent = workspace.agents.find((candidate) => value === agentOwner(candidate.id));
  return agent ? agentOwner(agent.id) : null;
}

export function ruleFilterToQuery(filter: RuleFilter): URLSearchParams {
  return toQuery([
    ['tool', formatToolRef(filter.tool)],
    ['tag', filter.tagId],
    ['decision', filter.decision],
    ['toolType', filter.toolType],
    ['owner', filter.owner],
  ]);
}

export function ruleFilterFromQuery(workspace: Workspace, query: URLSearchParams): RuleFilter {
  return {
    tool: parseToolRef(workspace, query.get('tool')),
    tagId: existingTagId(workspace, query.get('tag')),
    decision: pick(DECISIONS, query.get('decision')),
    toolType: pick(TOOL_TYPES, query.get('toolType')),
    owner: parseOwner(workspace, query.get('owner')),
  };
}
