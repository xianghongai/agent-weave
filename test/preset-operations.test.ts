import { describe, expect, it } from 'vitest';

import { mergePresets, resetToPresets } from '@/lib/preset-operations';
import { createPresetWorkspace } from '@/lib/presets';
import type { Agent, BuiltInTool, Decision, Rule, ToolType, Workspace } from '@/lib/workspace';
import type { OperationContext } from '@/lib/workspace-operations';

const BEFORE = '2026-01-01T00:00:00.000Z';
const NOW = '2026-10-23T12:00:00.000Z';

const ctx: OperationContext = {
  now: () => NOW,
  newId: () => {
    throw new Error('合并与重置不应生成新的内部 ID');
  },
};

function workspace(changes: Partial<Workspace>): Workspace {
  return {
    schema_version: 1,
    updated_at: BEFORE,
    tags: [],
    command_tools: [],
    mcp_servers: [],
    agents: [],
    rules: [],
    ...changes,
  };
}

describe('合并预设', () => {
  it('预设的内部 ID 是固定值：每次创建都相同，且全部条目之间互不重复', () => {
    function ids(ws: Workspace): string[] {
      return [
        ...ws.tags,
        ...ws.command_tools,
        ...ws.mcp_servers,
        ...ws.agents,
        ...ws.agents.flatMap((agent) => agent.built_in_tools),
        ...ws.rules,
      ].map((entry) => entry.id);
    }

    const first = ids(createPresetWorkspace());
    expect(ids(createPresetWorkspace())).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
  });

  it('默认使用站点预设：合并进空工作区，得到预设的全部内容', () => {
    const { workspace: merged, report } = mergePresets(workspace({}), undefined, ctx);

    expect(merged).toEqual({ ...createPresetWorkspace(), updated_at: NOW });
    expect(report.skipped).toEqual([]);
  });

  it('预设条目已全部存在时，工作区原样返回，修改时间不变', () => {
    const mine = { ...createPresetWorkspace(), updated_at: BEFORE };

    const { workspace: merged, report } = mergePresets(mine, undefined, ctx);

    expect(merged).toBe(mine);
    expect(report).toEqual({ added: 0, skipped: [] });
  });

  it('只新增工作区中没有的标签，已有标签保持用户修改后的样子', () => {
    const preset = workspace({
      tags: [
        { id: 'preset-tag-vcs', key: 'vcs', name: '版本控制' },
        { id: 'preset-tag-fs', key: 'fs', name: '文件系统' },
      ],
    });
    const mine = workspace({ tags: [{ id: 'preset-tag-vcs', key: 'scm', name: '我改过的名称' }] });

    const { workspace: merged, report } = mergePresets(mine, preset, ctx);

    expect(merged.tags).toEqual([
      { id: 'preset-tag-vcs', key: 'scm', name: '我改过的名称' },
      { id: 'preset-tag-fs', key: 'fs', name: '文件系统' },
    ]);
    expect(merged.updated_at).toBe(NOW);
    expect(report.added).toBe(1);
  });

  it('预设标签的标识与工作区中另一个标签相同时，跳过它并在结果中列出', () => {
    const preset = workspace({ tags: [{ id: 'preset-tag-vcs', key: 'vcs', name: '版本控制' }] });
    const mine = workspace({ tags: [{ id: 'my-tag', key: 'vcs', name: '我自己的' }] });

    const { workspace: merged, report } = mergePresets(mine, preset, ctx);

    expect(merged.tags).toEqual([{ id: 'my-tag', key: 'vcs', name: '我自己的' }]);
    expect(report.skipped).toEqual([
      { kind: 'tag', id: 'preset-tag-vcs', key: 'vcs', reason: 'keyConflict', mergedInto: 'my-tag' },
    ]);
  });

  it('预设标签因标识冲突被跳过时，新增的工具改用工作区中同标识的标签，不留下已删除的标签', () => {
    const preset = workspace({
      tags: [
        { id: 'preset-tag-vcs', key: 'vcs', name: '版本控制' },
        { id: 'preset-tag-net', key: 'net', name: '网络' },
      ],
      command_tools: [
        {
          id: 'preset-command-git',
          key: 'git',
          description: '',
          tag_ids: ['preset-tag-vcs', 'preset-tag-net'],
          high_risk: false,
          high_risk_reason: '',
        },
        {
          id: 'preset-command-hg',
          key: 'hg',
          description: '',
          tag_ids: ['my-vcs', 'preset-tag-vcs'],
          high_risk: false,
          high_risk_reason: '',
        },
        {
          id: 'preset-command-ls',
          key: 'ls',
          description: '',
          tag_ids: ['preset-tag-vcs'],
          high_risk: false,
          high_risk_reason: '',
        },
      ],
      mcp_servers: [
        {
          id: 'preset-mcp-github',
          key: 'github',
          content: {},
          description: '',
          tag_ids: ['preset-tag-vcs'],
          high_risk: false,
          high_risk_reason: '',
        },
      ],
      agents: [
        agent('preset-agent-claude-code', 'Claude Code', [
          { ...builtIn('preset-builtin-read', 'Read'), tag_ids: ['preset-tag-vcs'] },
        ]),
        agent('preset-agent-codex', 'Codex CLI', [
          { ...builtIn('preset-builtin-shell', 'shell'), tag_ids: ['preset-tag-vcs'] },
        ]),
      ],
    });
    const mine = workspace({
      tags: [{ id: 'my-vcs', key: 'vcs', name: '我的版本控制' }],
      // 已有的工具保持不变，即使它还引用着预设标签的 ID。
      command_tools: [
        {
          id: 'preset-command-ls',
          key: 'ls',
          description: '',
          tag_ids: ['preset-tag-vcs'],
          high_risk: false,
          high_risk_reason: '',
        },
      ],
      agents: [agent('preset-agent-claude-code', 'Claude Code', [])],
    });

    const { workspace: merged, report } = mergePresets(mine, preset, ctx);

    expect(merged.tags.map((tag) => tag.id)).toEqual(['my-vcs', 'preset-tag-net']);
    expect(merged.command_tools.map(({ id, tag_ids }) => ({ id, tag_ids }))).toEqual([
      { id: 'preset-command-ls', tag_ids: ['preset-tag-vcs'] },
      { id: 'preset-command-git', tag_ids: ['my-vcs', 'preset-tag-net'] },
      { id: 'preset-command-hg', tag_ids: ['my-vcs'] },
    ]);
    expect(merged.mcp_servers[0]?.tag_ids).toEqual(['my-vcs']);
    expect(merged.agents.map((entry) => entry.built_in_tools.map((tool) => tool.tag_ids))).toEqual([
      [['my-vcs']],
      [['my-vcs']],
    ]);
    expect(report.skipped).toEqual([
      { kind: 'tag', id: 'preset-tag-vcs', key: 'vcs', reason: 'keyConflict', mergedInto: 'my-vcs' },
    ]);
    // 合并前后的预设对象不受影响。
    expect(preset.command_tools[0]?.tag_ids).toEqual(['preset-tag-vcs', 'preset-tag-net']);
  });

  it('命令工具与 MCP Server 同样只新增缺少的，已修改的保持不变，标识冲突时跳过', () => {
    const preset = workspace({
      command_tools: [
        {
          id: 'preset-command-git',
          key: 'git',
          description: '版本控制',
          tag_ids: [],
          high_risk: false,
          high_risk_reason: '',
        },
        {
          id: 'preset-command-rm',
          key: 'rm',
          description: '删除文件',
          tag_ids: [],
          high_risk: true,
          high_risk_reason: '',
        },
        {
          id: 'preset-command-ls',
          key: 'ls',
          description: '列出目录',
          tag_ids: ['preset-tag-fs'],
          high_risk: false,
          high_risk_reason: '',
        },
      ],
      mcp_servers: [
        {
          id: 'preset-mcp-fetch',
          key: 'fetch',
          content: { command: 'uvx', args: ['mcp-server-fetch'] },
          description: '',
          tag_ids: [],
          high_risk: false,
          high_risk_reason: '',
        },
        {
          id: 'preset-mcp-github',
          key: 'github',
          content: { url: 'https://example.com/mcp/' },
          description: '',
          tag_ids: [],
          high_risk: false,
          high_risk_reason: '',
        },
      ],
    });
    const mine = workspace({
      command_tools: [
        {
          id: 'preset-command-git',
          key: 'git',
          description: '我的描述',
          tag_ids: [],
          high_risk: true,
          high_risk_reason: '',
        },
        { id: 'my-rm', key: 'rm', description: '', tag_ids: [], high_risk: false, high_risk_reason: '' },
      ],
      mcp_servers: [
        {
          id: 'my-fetch',
          key: 'fetch',
          content: { command: 'npx' },
          description: '',
          tag_ids: [],
          high_risk: false,
          high_risk_reason: '',
        },
      ],
    });

    const { workspace: merged, report } = mergePresets(mine, preset, ctx);

    expect(merged.command_tools).toEqual([
      {
        id: 'preset-command-git',
        key: 'git',
        description: '我的描述',
        tag_ids: [],
        high_risk: true,
        high_risk_reason: '',
      },
      { id: 'my-rm', key: 'rm', description: '', tag_ids: [], high_risk: false, high_risk_reason: '' },
      {
        id: 'preset-command-ls',
        key: 'ls',
        description: '列出目录',
        tag_ids: ['preset-tag-fs'],
        high_risk: false,
        high_risk_reason: '',
      },
    ]);
    expect(merged.mcp_servers.map((server) => server.id)).toEqual(['my-fetch', 'preset-mcp-github']);
    expect(report.skipped).toEqual([
      { kind: 'command_tool', id: 'preset-command-rm', key: 'rm', reason: 'keyConflict' },
      { kind: 'mcp_server', id: 'preset-mcp-fetch', key: 'fetch', reason: 'keyConflict' },
    ]);
  });

  it('已有 Agent 保持不变，只补上缺少的内置工具；新 Agent 整个新增；名称冲突的 Agent 跳过', () => {
    const preset = workspace({
      agents: [
        agent('preset-agent-claude-code', 'Claude Code', [
          builtIn('preset-builtin-read', 'Read'),
          builtIn('preset-builtin-write', 'Write'),
          builtIn('preset-builtin-edit', 'Edit'),
        ]),
        agent('preset-agent-codex', 'Codex CLI', [builtIn('preset-builtin-shell', 'shell')]),
        agent('preset-agent-antigravity', 'Antigravity', []),
      ],
    });
    const myClaude = {
      ...agent('preset-agent-claude-code', 'Claude Code', [
        {
          ...builtIn('preset-builtin-read', 'Read'),
          description: '我改过的描述',
          high_risk: true,
          high_risk_reason: '',
        },
        builtIn('my-write', 'Write'),
      ]),
      description: '我的 Claude Code',
      permission_output: null,
    };
    const mine = workspace({ agents: [myClaude, agent('my-agent', 'Antigravity', [])] });

    const { workspace: merged, report } = mergePresets(mine, preset, ctx);

    expect(merged.agents).toEqual([
      {
        ...myClaude,
        built_in_tools: [...myClaude.built_in_tools, builtIn('preset-builtin-edit', 'Edit')],
      },
      agent('my-agent', 'Antigravity', []),
      agent('preset-agent-codex', 'Codex CLI', [builtIn('preset-builtin-shell', 'shell')]),
    ]);
    expect(report.skipped).toEqual([
      {
        kind: 'built_in_tool',
        id: 'preset-builtin-write',
        key: 'Write',
        agentName: 'Claude Code',
        reason: 'keyConflict',
      },
      { kind: 'agent', id: 'preset-agent-antigravity', key: 'Antigravity', reason: 'keyConflict' },
    ]);
    expect(report.added).toBe(2);
  });

  it('规则只新增缺少的；所指工具因冲突被跳过时，规则也跳过并列出', () => {
    const preset = workspace({
      command_tools: [
        { id: 'preset-command-git', key: 'git', description: '', tag_ids: [], high_risk: false, high_risk_reason: '' },
        { id: 'preset-command-rm', key: 'rm', description: '', tag_ids: [], high_risk: true, high_risk_reason: '' },
      ],
      agents: [
        agent('preset-agent-claude-code', 'Claude Code', [
          builtIn('preset-builtin-write', 'Write'),
          builtIn('preset-builtin-edit', 'Edit'),
        ]),
      ],
      rules: [
        rule('preset-rule-git-allow', 'command', 'preset-command-git', '', 'allow'),
        rule('preset-rule-git-push-ask', 'command', 'preset-command-git', 'push', 'ask'),
        rule('preset-rule-rm-ask', 'command', 'preset-command-rm', '', 'ask'),
        rule('preset-rule-edit-ask', 'built_in', 'preset-builtin-edit', '', 'ask'),
        rule('preset-rule-write-ask', 'built_in', 'preset-builtin-write', './src/**', 'ask'),
      ],
    });
    const mine = workspace({
      command_tools: [
        { id: 'preset-command-git', key: 'git', description: '', tag_ids: [], high_risk: false, high_risk_reason: '' },
        { id: 'my-rm', key: 'rm', description: '', tag_ids: [], high_risk: false, high_risk_reason: '' },
      ],
      agents: [agent('preset-agent-claude-code', 'Claude Code', [builtIn('my-write', 'Write')])],
      rules: [rule('preset-rule-git-allow', 'command', 'preset-command-git', '', 'deny')],
    });

    const { workspace: merged, report } = mergePresets(mine, preset, ctx);

    expect(merged.rules).toEqual([
      rule('preset-rule-git-allow', 'command', 'preset-command-git', '', 'deny'),
      rule('preset-rule-git-push-ask', 'command', 'preset-command-git', 'push', 'ask'),
      rule('preset-rule-edit-ask', 'built_in', 'preset-builtin-edit', '', 'ask'),
    ]);
    expect(report.skipped.filter((skip) => skip.kind === 'rule')).toEqual([
      {
        kind: 'rule',
        id: 'preset-rule-rm-ask',
        tool: { type: 'command', key: 'rm' },
        pattern: '',
        reason: 'toolSkipped',
      },
      {
        kind: 'rule',
        id: 'preset-rule-write-ask',
        tool: { type: 'built_in', key: 'Write' },
        pattern: './src/**',
        reason: 'toolSkipped',
      },
    ]);
  });
});

describe('重置为预设', () => {
  it('得到站点预设的全部内容，修改时间取当前时间', () => {
    const { workspace: reset } = resetToPresets(ctx);

    expect(reset).toEqual({ ...createPresetWorkspace(), updated_at: NOW });
  });
});

function rule(id: string, type: ToolType, toolId: string, pattern: string, decision: Decision): Rule {
  return { id, tool: { type, id: toolId }, pattern, decision, high_risk: false, high_risk_reason: '' };
}

function agent(id: string, name: string, built_in_tools: BuiltInTool[]): Agent {
  return {
    id,
    name,
    description: '',
    built_in_tools,
    permission_output: {
      property_path: 'permissions',
      scopes: [],
      decision_keys: { allow: 'allow', ask: 'ask', deny: 'deny' },
      command_templates: { with_pattern: 'Bash({command} {pattern} *)', without_pattern: 'Bash({command} *)' },
      mcp_templates: { with_pattern: '', without_pattern: '' },
    },
    mcp_output: null,
  };
}

function builtIn(id: string, key: string): BuiltInTool {
  return {
    id,
    key,
    description: '',
    tag_ids: [],
    high_risk: false,
    high_risk_reason: '',
    writes: false,
    templates: { with_pattern: `${key}({pattern})`, without_pattern: key },
  };
}
