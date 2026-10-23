import { describe, expect, it } from 'vitest';

import { generate } from '@/lib/generate';
import {
  type Agent,
  type BuiltInTool,
  type CommandTool,
  type Decision,
  EMPTY_DEVICE_SETTINGS,
  type McpServer,
  type Rule,
  type ToolRef,
  type Workspace,
} from '@/lib/workspace';

/* 生成结果中的高危提示与冲突提示。 */

const claude: Agent = {
  id: 'agent-claude',
  name: 'Claude Code',
  description: '',
  built_in_tools: [],
  permission_output: {
    property_path: 'permissions',
    scopes: [],
    decision_keys: { allow: 'allow', ask: 'ask', deny: 'deny' },
    command_templates: { with_pattern: 'Bash({command} {pattern} *)', without_pattern: 'Bash({command} *)' },
    mcp_templates: { with_pattern: 'mcp__{server}__{pattern}', without_pattern: 'mcp__{server}' },
  },
  mcp_output: null,
};

function command(key: string, high_risk = false): CommandTool {
  return { id: `command-${key}`, key, description: '', tag_ids: [], high_risk };
}

function server(key: string, high_risk = false): McpServer {
  return { id: `server-${key}`, key, content: {}, description: '', tag_ids: [], high_risk };
}

function builtIn(key: string, flags: { writes?: boolean; high_risk?: boolean } = {}): BuiltInTool {
  return {
    id: `built-in-${key}`,
    key,
    description: '',
    tag_ids: [],
    high_risk: flags.high_risk ?? false,
    writes: flags.writes ?? false,
    templates: { with_pattern: `${key}({pattern}**)`, without_pattern: key },
  };
}

function rule(id: string, tool: ToolRef, pattern: string, decision: Decision, high_risk = false): Rule {
  return { id, tool, pattern, decision, high_risk };
}

const ref = {
  command: (key: string): ToolRef => ({ type: 'command', id: `command-${key}` }),
  mcp: (key: string): ToolRef => ({ type: 'mcp', id: `server-${key}` }),
  builtIn: (key: string): ToolRef => ({ type: 'built_in', id: `built-in-${key}` }),
};

function workspace(parts: Partial<Workspace>): Workspace {
  return {
    schema_version: 1,
    updated_at: '2026-10-24T00:00:00.000Z',
    tags: [],
    command_tools: [],
    mcp_servers: [],
    agents: [claude],
    rules: [],
    ...parts,
  };
}

function noticesOf(ws: Workspace, agentId = claude.id) {
  return generate(ws, agentId, EMPTY_DEVICE_SETTINGS)?.notices;
}

describe('生成：高危提示', () => {
  it('允许被标记为高危的命令工具时提示', () => {
    const ws = workspace({
      command_tools: [command('rm', true), command('ls')],
      rules: [rule('allow-rm', ref.command('rm'), '', 'allow'), rule('allow-ls', ref.command('ls'), '', 'allow')],
    });
    expect(noticesOf(ws)).toEqual([{ type: 'highRisk', ruleId: 'allow-rm' }]);
  });

  it('允许被标记为高危的 MCP Server 或内置工具时提示', () => {
    const ws = workspace({
      mcp_servers: [server('shell', true)],
      agents: [{ ...claude, built_in_tools: [builtIn('Bash', { high_risk: true })] }],
      rules: [
        rule('allow-shell', ref.mcp('shell'), 'run', 'allow'),
        rule('allow-bash', ref.builtIn('Bash'), '', 'allow'),
      ],
    });
    expect(noticesOf(ws)).toEqual([
      { type: 'highRisk', ruleId: 'allow-shell' },
      { type: 'highRisk', ruleId: 'allow-bash' },
    ]);
  });

  it('规则本身被标记为高危时提示，即使所指工具不高危', () => {
    const ws = workspace({
      command_tools: [command('git')],
      rules: [
        rule('force-push', ref.command('git'), 'push --force', 'allow', true),
        rule('push', ref.command('git'), 'push', 'allow'),
      ],
    });
    expect(noticesOf(ws)).toEqual([{ type: 'highRisk', ruleId: 'force-push' }]);
  });

  it('允许写入类内置工具作用于全部、根目录或主目录时提示，其他目录不提示', () => {
    const patterns = ['', '/', '~/', '{{home}}/', './src/', '~/projects/', '{{home}}/projects/'];
    const ws = workspace({
      agents: [{ ...claude, built_in_tools: [builtIn('Edit', { writes: true })] }],
      rules: patterns.map((pattern) => rule(`edit:${pattern}`, ref.builtIn('Edit'), pattern, 'allow')),
    });
    // 本机设置完整、{{home}} 已展开时，高危判定仍按未展开的原始模式，也不产生占位符提示。
    expect(generate(ws, claude.id, { os: 'linux', user_name: 'alice' })?.notices).toEqual([
      { type: 'highRisk', ruleId: 'edit:' },
      { type: 'highRisk', ruleId: 'edit:/' },
      { type: 'highRisk', ruleId: 'edit:{{home}}/' },
      { type: 'highRisk', ruleId: 'edit:~/' },
    ]);
  });

  it('非写入类内置工具作用于主目录时不提示', () => {
    const ws = workspace({
      agents: [{ ...claude, built_in_tools: [builtIn('Read')] }],
      rules: [rule('read-home', ref.builtIn('Read'), '~/', 'allow'), rule('read', ref.builtIn('Read'), '', 'allow')],
    });
    expect(noticesOf(ws)).toEqual([]);
  });

  it('ask 与 deny 规则满足任何条件都不提示高危', () => {
    const ws = workspace({
      command_tools: [command('rm', true)],
      agents: [{ ...claude, built_in_tools: [builtIn('Edit', { writes: true, high_risk: true })] }],
      rules: [
        rule('ask-rm', ref.command('rm'), '', 'ask', true),
        rule('deny-rm', ref.command('rm'), '-rf', 'deny', true),
        rule('ask-edit', ref.builtIn('Edit'), '~/', 'ask', true),
        rule('deny-edit', ref.builtIn('Edit'), '/', 'deny', true),
      ],
    });
    expect(noticesOf(ws)).toEqual([]);
  });
});

describe('生成：冲突提示', () => {
  it('同一工具、同一模式出现不同决策时提示，各决策照常输出', () => {
    const ws = workspace({
      command_tools: [command('npm'), command('pnpm')],
      rules: [
        rule('npm-publish-allow', ref.command('npm'), 'publish', 'allow'),
        rule('npm-publish-deny', ref.command('npm'), 'publish', 'deny'),
        rule('npm-install', ref.command('npm'), 'install', 'allow'),
        rule('pnpm-publish', ref.command('pnpm'), 'publish', 'ask'),
      ],
    });
    const output = generate(ws, claude.id, EMPTY_DEVICE_SETTINGS);
    expect(output?.notices).toEqual([{ type: 'conflict', ruleIds: ['npm-publish-allow', 'npm-publish-deny'] }]);
    expect(output?.permission?.decisions.map((d) => d.entries)).toEqual([
      ['Bash(npm install *)', 'Bash(npm publish *)'],
      ['Bash(pnpm publish *)'],
      ['Bash(npm publish *)'],
    ]);
  });

  it('同一决策重复出现不算冲突', () => {
    const ws = workspace({
      command_tools: [command('npm')],
      rules: [rule('a', ref.command('npm'), 'test', 'allow'), rule('b', ref.command('npm'), 'test', 'allow')],
    });
    expect(noticesOf(ws)).toEqual([]);
  });

  it('一组冲突列出该工具、该模式下的全部规则', () => {
    const ws = workspace({
      command_tools: [command('git')],
      rules: [
        rule('push-allow', ref.command('git'), 'push', 'allow'),
        rule('push-ask', ref.command('git'), 'push', 'ask'),
        rule('push-allow-again', ref.command('git'), 'push', 'allow'),
      ],
    });
    expect(noticesOf(ws)).toEqual([{ type: 'conflict', ruleIds: ['push-allow', 'push-ask', 'push-allow-again'] }]);
  });
});

describe('生成：提示的范围', () => {
  const antigravity: Agent = {
    ...claude,
    id: 'agent-antigravity',
    name: 'Antigravity',
    built_in_tools: [builtIn('write_file', { writes: true })],
  };
  const ws = workspace({
    command_tools: [command('rm', true)],
    agents: [{ ...claude, built_in_tools: [builtIn('Edit', { writes: true })] }, antigravity],
    rules: [
      rule('allow-rm', ref.command('rm'), '', 'allow'),
      rule('edit-home', ref.builtIn('Edit'), '~/', 'allow'),
      rule('edit-home-deny', ref.builtIn('Edit'), '~/', 'deny'),
      rule('write-root', ref.builtIn('write_file'), '/', 'allow'),
    ],
  });

  it('内置工具规则的提示只出现在所属 Agent 中，共享规则的提示出现在每个 Agent 中', () => {
    expect(noticesOf(ws, claude.id)).toEqual([
      { type: 'highRisk', ruleId: 'allow-rm' },
      { type: 'highRisk', ruleId: 'edit-home' },
      { type: 'conflict', ruleIds: ['edit-home', 'edit-home-deny'] },
    ]);
    expect(noticesOf(ws, antigravity.id)).toEqual([
      { type: 'highRisk', ruleId: 'allow-rm' },
      { type: 'highRisk', ruleId: 'write-root' },
    ]);
  });

  it('跳过的规则不产生提示：它们不在输出中', () => {
    const noDeny: Agent = {
      ...claude,
      built_in_tools: [builtIn('Edit', { writes: true })],
      permission_output: claude.permission_output && {
        ...claude.permission_output,
        decision_keys: { allow: 'allow', ask: 'ask', deny: '' },
        command_templates: { with_pattern: 'Bash({command} {pattern} *)', without_pattern: '' },
      },
    };
    const output = generate({ ...ws, agents: [noDeny] }, claude.id, EMPTY_DEVICE_SETTINGS);
    expect(output?.skippedRules.map((skipped) => skipped.ruleId)).toEqual(['allow-rm', 'edit-home-deny']);
    expect(output?.notices).toEqual([{ type: 'highRisk', ruleId: 'edit-home' }]);
  });

  it('不输出权限的 Agent 没有规则提示', () => {
    const silent: Agent = { ...claude, permission_output: null };
    expect(noticesOf({ ...ws, agents: [silent] })).toEqual([]);
  });
});
