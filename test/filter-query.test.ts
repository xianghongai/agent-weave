import { describe, expect, it } from 'vitest';

import { ruleFilterFromQuery, ruleFilterToQuery, toolFilterFromQuery, toolFilterToQuery } from '@/lib/filter-query';
import type { Workspace } from '@/lib/workspace';
import { NO_RULE_FILTER, NO_TOOL_FILTER } from '@/lib/workspace-operations';

const tool = { description: '', tag_ids: [], high_risk: false, high_risk_reason: '' };

const ws: Workspace = {
  schema_version: 1,
  updated_at: '2026-01-01T00:00:00.000Z',
  tags: [{ id: 'vcs', key: 'vcs', name: '版本控制' }],
  command_tools: [{ ...tool, id: 'git', key: 'git' }],
  mcp_servers: [{ ...tool, id: 'git', key: 'git', content: {} }],
  agents: [
    {
      id: 'claude',
      name: 'Claude Code',
      description: '',
      built_in_tools: [
        { ...tool, id: 'read', key: 'Read', writes: false, templates: { with_pattern: '', without_pattern: '' } },
      ],
      permission_output: null,
      mcp_output: null,
    },
  ],
  rules: [],
};

function query(search: string): URLSearchParams {
  return new URLSearchParams(search);
}

describe('筛选条件与 URL 查询串', () => {
  it('工具筛选写进查询串，取默认值的条件不写', () => {
    expect(toolFilterToQuery({ name: 'gi t', tagId: 'vcs' }).toString()).toBe('name=gi+t&tag=vcs');
    expect(toolFilterToQuery({ name: '', tagId: 'vcs' }).toString()).toBe('tag=vcs');
    expect(toolFilterToQuery(NO_TOOL_FILTER).toString()).toBe('');
  });

  it('从查询串读回工具筛选；标签不存在时忽略这个条件', () => {
    expect(toolFilterFromQuery(ws, query('name=gi+t&tag=vcs'))).toEqual({ name: 'gi t', tagId: 'vcs' });
    expect(toolFilterFromQuery(ws, query('name=git&tag=deleted'))).toEqual({ name: 'git', tagId: null });
    expect(toolFilterFromQuery(ws, query(''))).toEqual(NO_TOOL_FILTER);
  });

  it('规则筛选写进查询串，工具写成“类型:ID”，归属写成 shared 或 agent:ID', () => {
    const filter = {
      tagId: 'vcs',
      decision: 'ask',
      toolType: 'command',
      tool: { type: 'mcp', id: 'git' },
      owner: 'agent:claude',
    } as const;
    const search = ruleFilterToQuery(filter).toString();
    expect(search).toBe('tool=mcp%3Agit&tag=vcs&decision=ask&toolType=command&owner=agent%3Aclaude');
    expect(ruleFilterFromQuery(ws, query(search))).toEqual(filter);
    expect(ruleFilterToQuery(NO_RULE_FILTER).toString()).toBe('');
  });

  it('同一 ID 的命令工具与 MCP 工具按类型区分，内置工具同样可以筛选', () => {
    expect(ruleFilterFromQuery(ws, query('tool=command:git')).tool).toEqual({ type: 'command', id: 'git' });
    expect(ruleFilterFromQuery(ws, query('tool=built_in:read')).tool).toEqual({ type: 'built_in', id: 'read' });
  });

  it('取值无效或指向已删除的条目时，只忽略这一个条件', () => {
    expect(
      ruleFilterFromQuery(ws, query('tool=command:deleted&tag=deleted&decision=maybe&toolType=plugin&owner=agent:gone'))
    ).toEqual(NO_RULE_FILTER);
    expect(ruleFilterFromQuery(ws, query('tool=git&owner=everyone'))).toEqual(NO_RULE_FILTER);
    expect(ruleFilterFromQuery(ws, query('owner=shared&decision=deny'))).toEqual({
      ...NO_RULE_FILTER,
      owner: 'shared',
      decision: 'deny',
    });
  });
});
