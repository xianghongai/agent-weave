import { describe, expect, it } from 'vitest';

import { type PresetFile, composePresets } from '@/lib/preset-composition';
import { type Agent, SCHEMA_VERSION } from '@/lib/workspace';

import { builtInTool, commandTool, mcpServer, rule } from './fixtures/entities';

/*
 * 预设合成：输入内联的小样本文件，断言合成出的工作区与警告。
 * 样本只写与该测试相关的条目，文案键和语言文件按需补齐，避免无关警告。
 */

function file(path: string, content: unknown): PresetFile {
  return { path, text: JSON.stringify(content) };
}

function locale(messages: Record<string, string> = {}): PresetFile {
  return file('locales/zh-CN.json', messages);
}

function composed(files: PresetFile[], messages: Record<string, string> = {}) {
  const result = composePresets(files, locale(messages));
  if (!('workspace' in result)) {
    throw new Error(`语法错误：${JSON.stringify(result.syntaxErrors)}`);
  }
  return result;
}

function agent(name: string): Agent {
  return {
    id: `preset-agent-${name}`,
    name,
    description: '',
    built_in_tools: [],
    permission_output: null,
    mcp_output: null,
  };
}

const git = commandTool({ id: 'preset-command-git', key: 'git' });
const ls = commandTool({ id: 'preset-command-ls', key: 'ls' });
const gitAllow = rule({ id: 'preset-rule-git-allow', tool: { type: 'command', id: git.id }, decision: 'allow' });
const lsAllow = rule({ id: 'preset-rule-ls-allow', tool: { type: 'command', id: ls.id }, decision: 'allow' });

describe('预设合成：拼接', () => {
  it('各文件中的同名数组依次拼接，并补上结构版本与固定的修改时间', () => {
    const { workspace, warnings } = composed([
      file('command-tools.jsonc', { command_tools: [git, ls] }),
      file('rules.jsonc', { rules: [gitAllow] }),
      file('agents/a.jsonc', { rules: [lsAllow] }),
    ]);
    expect(warnings).toEqual([]);
    expect(workspace).toEqual({
      schema_version: SCHEMA_VERSION,
      updated_at: expect.any(String),
      tags: [],
      command_tools: [git, ls],
      mcp_servers: [],
      agents: [],
      rules: [gitAllow, lsAllow],
    });
    expect(Date.parse(workspace.updated_at)).toBeLessThan(Date.parse('2026-10-24T00:00:00.000Z'));
  });

  it('根目录下的文件按标签、命令工具、MCP Server、共享规则的固定顺序拼接，与输入顺序无关', () => {
    const { workspace } = composed([
      file('rules.jsonc', { rules: [gitAllow] }),
      file('command-tools.jsonc', { command_tools: [git, ls], rules: [lsAllow] }),
    ]);
    expect(workspace.rules).toEqual([lsAllow, gitAllow]);
  });
});

describe('预设合成：文案键', () => {
  const claude: Agent = {
    ...agent('claude'),
    description: 'preset-agent-claude.description',
    built_in_tools: [
      builtInTool({
        id: 'preset-built-in-claude-read',
        key: 'Read',
        description: 'preset-built-in-claude-read.description',
      }),
    ],
    permission_output: {
      property_path: 'permissions',
      scopes: [{ name: 'preset-agent-claude.scope-user.name', path: '~/.claude/settings.json', note: '' }],
      decision_keys: { allow: 'allow', ask: 'ask', deny: 'deny' },
      command_templates: { with_pattern: 'Bash({command} {pattern})', without_pattern: 'Bash({command})' },
      mcp_templates: { with_pattern: '', without_pattern: '' },
    },
    mcp_output: {
      style: 'json',
      property_path: 'mcpServers',
      scopes: [
        {
          name: 'preset-agent-claude.mcp-scope-user.name',
          path: '~/.claude.json',
          note: 'preset-agent-claude.mcp-scope-user.note',
        },
      ],
    },
  };
  const files = [
    file('tags.jsonc', { tags: [{ id: 'preset-tag-vcs', key: 'vcs', name: 'preset-tag-vcs.name' }] }),
    file('command-tools.jsonc', {
      command_tools: [
        commandTool({
          id: 'preset-command-rm',
          key: 'rm',
          description: 'preset-command-rm.description',
          high_risk: true,
          high_risk_reason: 'preset-command-rm.high_risk_reason',
        }),
      ],
    }),
    file('mcp-servers.jsonc', {
      mcp_servers: [
        mcpServer({ id: 'preset-mcp-memory', key: 'memory', description: 'preset-mcp-memory.description' }),
      ],
    }),
    file('rules.jsonc', {
      rules: [
        rule({
          id: 'preset-rule-rm-ask',
          tool: { type: 'command', id: 'preset-command-rm' },
          decision: 'ask',
          description: 'preset-rule-rm-ask.description',
        }),
      ],
    }),
    file('agents/claude.jsonc', { agents: [claude] }),
  ];
  const messages = {
    'preset-tag-vcs.name': '版本控制',
    'preset-command-rm.description': '删除文件',
    'preset-command-rm.high_risk_reason': '无法恢复',
    'preset-mcp-memory.description': '长期记忆',
    'preset-rule-rm-ask.description': '删除前确认',
    'preset-agent-claude.description': '命令行 Agent',
    'preset-built-in-claude-read.description': '读取文件',
    'preset-agent-claude.scope-user.name': '用户级',
    'preset-agent-claude.mcp-scope-user.name': '用户级',
    'preset-agent-claude.mcp-scope-user.note': '对所有项目生效。',
  };

  it('给人看的文字按文案键替换成语言文件中的文字，空字符串保持为空', () => {
    const { workspace, warnings } = composed(files, messages);
    expect(warnings).toEqual([]);
    expect(workspace.tags[0]?.name).toBe('版本控制');
    expect(workspace.command_tools[0]).toMatchObject({ description: '删除文件', high_risk_reason: '无法恢复' });
    expect(workspace.mcp_servers[0]?.description).toBe('长期记忆');
    expect(workspace.rules[0]?.description).toBe('删除前确认');
    const [composedAgent] = workspace.agents;
    expect(composedAgent?.description).toBe('命令行 Agent');
    expect(composedAgent?.built_in_tools[0]?.description).toBe('读取文件');
    expect(composedAgent?.permission_output?.scopes[0]).toMatchObject({ name: '用户级', note: '' });
    expect(composedAgent?.mcp_output?.scopes[0]).toMatchObject({ name: '用户级', note: '对所有项目生效。' });
  });

  it('缺少的文案键与没有被使用的键都作为警告报出，缺少的键原样留在结果中', () => {
    const { 'preset-command-rm.description': _, ...rest } = messages;
    const { workspace, warnings } = composed(files, { ...rest, 'preset-command-gone.description': '已删除的命令' });
    expect(warnings).toEqual([
      { kind: 'missingMessage', key: 'preset-command-rm.description' },
      { kind: 'unusedMessage', key: 'preset-command-gone.description' },
    ]);
    expect(workspace.command_tools[0]?.description).toBe('preset-command-rm.description');
  });
});

describe('预设合成：逻辑问题', () => {
  it('合成结果没有通过导入校验时，以警告报出原因和条目 ID，仍然给出结果', () => {
    const dangling = rule({
      id: 'preset-rule-gone-allow',
      tool: { type: 'command', id: 'preset-command-gone' },
      decision: 'allow',
    });
    const { workspace, warnings } = composed([
      file('command-tools.jsonc', { command_tools: [git] }),
      file('rules.jsonc', { rules: [gitAllow, dangling] }),
    ]);
    expect(warnings).toEqual([
      { kind: 'invalidWorkspace', problem: 'danglingReference', entryId: 'preset-rule-gone-allow' },
    ]);
    expect(workspace.rules).toEqual([gitAllow, dangling]);
  });

  it('未知的顶层键作为警告报出：结构版本和修改时间由合成补上，不写在文件中；priority 只属于 Agent 文件', () => {
    const { workspace, warnings } = composed([
      file('command-tools.jsonc', { schema_version: 1, command_tools: [git] }),
      file('rules.jsonc', { priority: 10, rules: 'preset-rule-git-allow' }),
    ]);
    expect(warnings).toEqual([
      { kind: 'invalidFile', path: 'command-tools.jsonc', key: 'schema_version' },
      { kind: 'invalidFile', path: 'rules.jsonc', key: 'priority' },
      { kind: 'invalidFile', path: 'rules.jsonc', key: 'rules' },
    ]);
    expect(workspace.command_tools).toEqual([git]);
  });
});

describe('预设合成：语法错误', () => {
  it('允许注释和尾随逗号', () => {
    const text =
      '{\n  // 注释\n  "command_tools": [\n    { "id": "preset-command-git", "key": "git", "description": "", "tag_ids": [], "high_risk": false, "high_risk_reason": "" },\n  ],\n}\n';
    const { workspace, warnings } = composed([{ path: 'command-tools.jsonc', text }]);
    expect(warnings).toEqual([]);
    expect(workspace.command_tools).toEqual([git]);
  });

  it('语法错误单独返回，带文件名和从 1 开始的行列，包括语言文件', () => {
    const result = composePresets(
      [file('tags.jsonc', { tags: [] }), { path: 'agents/a.jsonc', text: '{\n  "agents": [\n    {} {}\n  ]\n}\n' }],
      { path: 'locales/zh-CN.json', text: '{ "a": }' }
    );
    expect(result).toEqual({
      syntaxErrors: [
        { path: 'agents/a.jsonc', line: 3, column: 8, code: 'CommaExpected' },
        { path: 'locales/zh-CN.json', line: 1, column: 8, code: 'ValueExpected' },
      ],
    });
  });
});

describe('预设合成：Agent 排序', () => {
  it('Agent 文件按 priority 降序、同值按文件名升序排列，priority 省略为 0，且不进入工作区', () => {
    const { workspace, warnings } = composed([
      file('agents/d.jsonc', { agents: [agent('d')] }),
      file('agents/c.jsonc', { priority: 50, agents: [agent('c')] }),
      file('agents/b.jsonc', { priority: 100, agents: [agent('b')], rules: [lsAllow] }),
      file('agents/a.jsonc', { priority: 50, agents: [agent('a')] }),
      file('agents/e.jsonc', { priority: 100, agents: [agent('e')], rules: [gitAllow] }),
      file('command-tools.jsonc', { command_tools: [git, ls] }),
    ]);
    expect(warnings).toEqual([]);
    expect(workspace.agents.map((a) => a.name)).toEqual(['b', 'e', 'a', 'c', 'd']);
    expect(workspace.rules).toEqual([lsAllow, gitAllow]);
    expect(workspace).not.toHaveProperty('priority');
  });
});
