import { describe, expect, it } from 'vitest';

import { exportWorkspace, importWorkspace } from '@/lib/workspace-file';
import type { WorkspaceMigration } from '@/lib/workspace-migrations';

import { corrupt, edited, getIn } from './fixtures/workspace';
import { commandTool, rule } from './fixtures/entities';

describe('导入工作区', () => {
  it('合法的工作区文件原样导入，保留文件中的修改时间', () => {
    expect(importWorkspace(JSON.stringify(edited()))).toEqual({ workspace: edited() });
  });

  it('允许行注释、块注释和尾随逗号：用户可以在编辑器里给导出文件加注释', () => {
    const json = JSON.stringify(edited(), null, 2);
    const text = `// 我的工作区\n${json.replace(/\n}$/, ',\n  /* 末尾的说明 */\n}')}`;
    expect(text).toContain('/* 末尾的说明 */');
    expect(importWorkspace(text)).toEqual({ workspace: edited() });
  });

  it.each([
    ['空文件', ''],
    ['只有注释', '// 空的'],
    ['被截断', JSON.stringify(edited()).slice(0, 100)],
    ['不是 JSON', 'schema_version: 1'],
  ])('文件不是合法的 JSON（%s）时返回原因码', (_, text) => {
    expect(importWorkspace(text)).toEqual({ problem: 'parseFailed' });
  });

  it.each([
    ['不是对象', '[1, 2]'],
    ['缺少结构版本', corrupt(['schema_version'], undefined)],
    ['缺少命令工具列表', corrupt(['command_tools'], undefined)],
    ['规则的决策类型错误', corrupt(['rules', 0, 'decision'], true)],
  ])('文件结构无效（%s）时返回原因码', (_, text) => {
    expect(importWorkspace(text)).toEqual({ problem: 'invalidStructure' });
  });

  it('文件来自更新版本的站点时拒绝导入', () => {
    expect(importWorkspace(corrupt(['schema_version'], 2))).toEqual({ problem: 'newerVersion' });
  });

  describe('旧版本迁移', () => {
    /** 假想的版本 0：命令工具列表叫 `commands`，规则的决策用大写。 */
    function versionZero(): Record<string, unknown> {
      const { command_tools, rules, ...rest } = edited();
      return {
        ...rest,
        schema_version: 0,
        commands: command_tools,
        rules: rules.map((rule) => ({ ...rule, decision: rule.decision.toUpperCase() })),
      };
    }

    const migrations: WorkspaceMigration[] = [
      {
        from: 0,
        migrate: ({ commands, rules, ...rest }) => ({
          ...rest,
          command_tools: commands,
          rules: (rules as Record<string, unknown>[]).map((rule) => ({
            ...rule,
            decision: String(rule.decision).toLowerCase(),
          })),
        }),
      },
    ];

    it('较旧的版本迁移到当前版本后再校验', () => {
      expect(importWorkspace(JSON.stringify(versionZero()), migrations)).toEqual({ workspace: edited() });
    });

    it('迁移后的结构仍然无效时返回原因码', () => {
      const text = JSON.stringify({ ...versionZero(), commands: 'make' });
      expect(importWorkspace(text, migrations)).toEqual({ problem: 'invalidStructure' });
    });

    it('迁移过程中出错时返回原因码，不抛异常', () => {
      const text = JSON.stringify({ ...versionZero(), rules: 'none' });
      expect(importWorkspace(text, migrations)).toEqual({ problem: 'invalidStructure' });
    });

    it('没有对应迁移的旧版本视为结构无效', () => {
      expect(importWorkspace(JSON.stringify(versionZero()), [])).toEqual({ problem: 'invalidStructure' });
    });

    it('站点内置的迁移不认识版本 0', () => {
      expect(importWorkspace(JSON.stringify(versionZero()))).toEqual({ problem: 'invalidStructure' });
    });
  });

  it.each([
    ['命令工具', corrupt(['rules', 0, 'tool', 'id'], 'tool-gone'), 'rule-1'],
    ['内置工具', corrupt(['rules', 1, 'tool', 'id'], 'builtin-gone'), 'rule-2'],
    ['类型不符的工具', corrupt(['rules', 0, 'tool', 'type'], 'mcp'), 'rule-1'],
  ])('规则引用了不存在的%s时返回原因码，并指出是哪条规则', (_, text, entryId) => {
    expect(importWorkspace(text)).toEqual({ problem: 'danglingReference', entryId });
  });

  it.each([
    ['标签', ['tags'], { id: 'tag-1', key: 'other', name: '其他' }, 'tag-1'],
    ['命令工具', ['command_tools'], commandTool({ id: 'tool-1', key: 'cmake' }), 'tool-1'],
    [
      '规则',
      ['rules'],
      rule({ id: 'rule-1', tool: { type: 'command', id: 'tool-1' }, pattern: 'x', decision: 'ask' }),
      'rule-1',
    ],
    [
      '不同 Agent 的内置工具',
      ['agents'],
      {
        id: 'agent-2',
        name: 'Codex CLI',
        description: '',
        built_in_tools: [{ ...edited().agents[0]!.built_in_tools[0]!, key: 'read' }],
        permission_output: null,
        mcp_output: null,
      },
      'builtin-1',
    ],
  ])('同类条目的内部 ID 重复（%s）时返回原因码，并指出重复的 ID', (_, path, item, entryId) => {
    const list = getIn(edited(), path) as unknown[];
    expect(importWorkspace(corrupt(path, [...list, item]))).toEqual({ problem: 'duplicateId', entryId });
  });

  it.each([
    ['标签', ['tags'], { id: 'tag-2', key: 'vcs', name: '重复' }, 'tag-2'],
    ['命令工具', ['command_tools'], commandTool({ id: 'tool-2', key: 'make' }), 'tool-2'],
    ['MCP Server', ['mcp_servers'], { ...edited().mcp_servers[0]!, id: 'mcp-2' }, 'mcp-2'],
    ['Agent 名称', ['agents'], { ...edited().agents[0]!, id: 'agent-2', built_in_tools: [] }, 'agent-2'],
    [
      '同一 Agent 的内置工具',
      ['agents', 0, 'built_in_tools'],
      { ...edited().agents[0]!.built_in_tools[0]!, id: 'builtin-2' },
      'builtin-2',
    ],
  ])('同类条目的标识重复（%s）时返回原因码，并指出后出现的那个条目', (_, path, item, entryId) => {
    const list = getIn(edited(), path) as unknown[];
    expect(importWorkspace(corrupt(path, [...list, item]))).toEqual({ problem: 'duplicateKey', entryId });
  });

  it('不同 Agent 的内置工具可以使用相同标识', () => {
    const second = {
      id: 'agent-2',
      name: 'Codex CLI',
      description: '',
      built_in_tools: [{ ...edited().agents[0]!.built_in_tools[0]!, id: 'builtin-2' }],
      permission_output: null,
      mcp_output: null,
    };
    expect(importWorkspace(corrupt(['agents'], [...edited().agents, second]))).toHaveProperty('workspace');
  });

  it('未标记高危的条目导入时清空高危说明，标记了高危的保留', () => {
    const cleared = importWorkspace(corrupt(['rules', 0, 'high_risk_reason'], '残留的说明'));
    expect('workspace' in cleared && cleared.workspace.rules[0]?.high_risk_reason).toBe('');
    const kept = importWorkspace(corrupt(['command_tools', 0, 'high_risk_reason'], '会覆盖产物'));
    expect('workspace' in kept && kept.workspace.command_tools[0]?.high_risk_reason).toBe('会覆盖产物');
  });

  it('工具上残留已删除标签的 ID 是合法的', () => {
    const text = corrupt(['command_tools', 0, 'tag_ids'], ['tag-gone']);
    expect(importWorkspace(text)).toHaveProperty('workspace.command_tools.0.tag_ids', ['tag-gone']);
  });
});

describe('导出工作区', () => {
  it('文件名带本地日期，扩展名为 .jsonc', () => {
    expect(exportWorkspace(edited(), new Date(2026, 0, 5, 23, 59)).fileName).toBe('agent-weave-2026-01-05.jsonc');
  });

  it('内容就是工作区 JSON，再导入得到同样的工作区', () => {
    const { text } = exportWorkspace(edited(), new Date(2026, 9, 23));
    expect(JSON.parse(text)).toEqual(edited());
    expect(importWorkspace(text)).toEqual({ workspace: edited() });
  });

  it('只包含工作区的属性，不含 Gist 设置和本机设置', () => {
    const leaked = { ...edited(), gist_token: 'secret', gist_id: 'abc', os: 'linux', user_names: { linux: 'me' } };
    const { text } = exportWorkspace(leaked, new Date(2026, 9, 23));
    expect(Object.keys(JSON.parse(text)).toSorted()).toEqual(
      ['agents', 'command_tools', 'mcp_servers', 'rules', 'schema_version', 'tags', 'updated_at'].toSorted()
    );
  });
});
