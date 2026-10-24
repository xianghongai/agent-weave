import { describe, expect, it } from 'vitest';

import { filterToolOptions, toolOptions } from '@/lib/tool-options';
import { SCHEMA_VERSION, type Agent, type Workspace } from '@/lib/workspace';

function commandTool(id: string, key: string) {
  return { id, key, description: '', tag_ids: [], high_risk: false };
}

function mcpServer(id: string, key: string) {
  return { id, key, content: {}, description: '', tag_ids: [], high_risk: false };
}

function agent(id: string, name: string, builtInKeys: string[]): Agent {
  return {
    id,
    name,
    description: '',
    built_in_tools: builtInKeys.map((key) => ({
      id: `${id}-${key}`,
      key,
      description: '',
      tag_ids: [],
      high_risk: false,
      writes: false,
      templates: { with_pattern: '', without_pattern: '' },
    })),
    permission_output: null,
    mcp_output: null,
  };
}

function workspace(changes: Partial<Workspace> = {}): Workspace {
  return {
    schema_version: SCHEMA_VERSION,
    updated_at: '2026-10-24T00:00:00.000Z',
    tags: [],
    command_tools: [],
    mcp_servers: [],
    agents: [],
    rules: [],
    ...changes,
  };
}

const sample = workspace({
  command_tools: [commandTool('c1', 'pnpm'), commandTool('c2', 'git')],
  mcp_servers: [mcpServer('m1', 'zap'), mcpServer('m2', 'context7')],
  agents: [agent('a1', 'Claude Code', ['Write', 'Edit']), agent('a2', 'Codex CLI', ['shell'])],
});

describe('toolOptions', () => {
  it('按命令工具、MCP 工具、内置工具的顺序排列，同类内按标识排序', () => {
    expect(toolOptions(sample).map((option) => option.label)).toEqual([
      'git',
      'pnpm',
      'context7',
      'zap',
      'Edit · Claude Code',
      'Write · Claude Code',
      'shell · Codex CLI',
    ]);
  });

  it('内置工具带上所属 Agent 的名称，共享工具不带', () => {
    const labels = toolOptions(sample).map((option) => option.label);
    expect(labels).toContain('Edit · Claude Code');
    expect(labels).toContain('git');
  });

  it('保留指向工具的类型和内部 ID', () => {
    const git = toolOptions(sample).find((option) => option.label === 'git');
    expect(git?.ref).toEqual({ type: 'command', id: 'c2' });
  });
});

describe('filterToolOptions', () => {
  const options = toolOptions(sample);

  it('空查询返回全部工具', () => {
    expect(filterToolOptions(options, '')).toHaveLength(options.length);
  });

  it('只有空白字符时也返回全部工具', () => {
    expect(filterToolOptions(options, '   ')).toHaveLength(options.length);
  });

  it('按标签做不区分大小写的子串匹配', () => {
    expect(filterToolOptions(options, 'GIT').map((option) => option.label)).toEqual(['git']);
    expect(filterToolOptions(options, 'text').map((option) => option.label)).toEqual(['context7']);
  });

  it('内置工具可以用 Agent 名称搜到', () => {
    expect(filterToolOptions(options, 'codex').map((option) => option.label)).toEqual(['shell · Codex CLI']);
  });

  it('没有匹配时返回空数组', () => {
    expect(filterToolOptions(options, 'nomatch')).toEqual([]);
  });
});
