import { describe, expect, it } from 'vitest';

import { generate } from '@/lib/generate';
import {
  type Agent,
  type CommandTool,
  type Decision,
  EMPTY_DEVICE_SETTINGS,
  type Rule,
  type Workspace,
} from '@/lib/workspace';

/** 与 Claude Code 预设相同的权限输出，作为大多数用例的 Agent。 */
const claude: Agent = {
  id: 'agent-claude',
  name: 'Claude Code',
  description: '',
  built_in_tools: [],
  permission_output: {
    property_path: 'permissions',
    scopes: [{ name: '用户级', path: '~/.claude/settings.json', note: '' }],
    decision_keys: { allow: 'allow', ask: 'ask', deny: 'deny' },
    command_templates: { with_pattern: 'Bash({command} {pattern} *)', without_pattern: 'Bash({command} *)' },
    mcp_templates: { with_pattern: 'mcp__{server}__{pattern}', without_pattern: 'mcp__{server}' },
  },
  mcp_output: null,
};

function tool(key: string): CommandTool {
  return { id: `tool-${key}`, key, description: '', tag_ids: [], high_risk: false };
}

let ruleSeq = 0;
function rule(toolKey: string, pattern: string, decision: Decision): Rule {
  ruleSeq += 1;
  return {
    id: `rule-${ruleSeq}`,
    tool: { type: 'command', id: `tool-${toolKey}` },
    pattern,
    decision,
    high_risk: false,
  };
}

function workspace(tools: string[], rules: Rule[], agent: Agent = claude): Workspace {
  return {
    schema_version: 1,
    updated_at: '2026-10-23T00:00:00.000Z',
    tags: [],
    command_tools: tools.map(tool),
    mcp_servers: [],
    agents: [agent],
    rules,
  };
}

/** 生成某一决策下的全部条目，即“复制内部”文本拆回数组。 */
function entries(ws: Workspace, decision: Decision): string[] {
  const output = generate(ws, claude.id, EMPTY_DEVICE_SETTINGS);
  const section = output?.permission?.decisions.find((d) => d.decision === decision);
  return section?.entries ?? [];
}

describe('生成：命令工具的模板选择', () => {
  it('模式为空时选用无模式模板', () => {
    const ws = workspace(['git'], [rule('git', '', 'allow')]);
    expect(entries(ws, 'allow')).toEqual(['Bash(git *)']);
  });

  it('模式不为空时选用有模式模板', () => {
    const ws = workspace(['git'], [rule('git', 'push --force', 'deny')]);
    expect(entries(ws, 'deny')).toEqual(['Bash(git push --force *)']);
  });

  it('模式中的 * 原样代入，不做翻译', () => {
    const ws = workspace(['docker'], [rule('docker', 'run * --privileged', 'deny')]);
    expect(entries(ws, 'deny')).toEqual(['Bash(docker run * --privileged *)']);
  });

  it('模式中出现模板占位符时不再二次代入', () => {
    const ws = workspace(['echo'], [rule('echo', '{command}', 'allow')]);
    expect(entries(ws, 'allow')).toEqual(['Bash(echo {command} *)']);
  });
});

describe('生成：排序与去重', () => {
  it('按工具标识、再按模式排序，与录入顺序无关', () => {
    const ws = workspace(
      ['pnpm', 'git'],
      [
        rule('pnpm', 'install', 'allow'),
        rule('git', 'status', 'allow'),
        rule('pnpm', '', 'allow'),
        rule('git', 'log', 'allow'),
      ]
    );
    expect(entries(ws, 'allow')).toEqual([
      'Bash(git log *)',
      'Bash(git status *)',
      'Bash(pnpm *)',
      'Bash(pnpm install *)',
    ]);
  });

  it('同一决策内，生成相同字符串的规则只保留一条', () => {
    const ws = workspace(['git'], [rule('git', 'status', 'allow'), rule('git', 'status', 'allow')]);
    expect(entries(ws, 'allow')).toEqual(['Bash(git status *)']);
  });

  it('不同决策之间不去重', () => {
    const ws = workspace(['git'], [rule('git', 'push', 'allow'), rule('git', 'push', 'deny')]);
    expect(entries(ws, 'allow')).toEqual(['Bash(git push *)']);
    expect(entries(ws, 'deny')).toEqual(['Bash(git push *)']);
  });
});

describe('生成：预览与复制文本', () => {
  const ws = workspace(
    ['git', 'rm'],
    [rule('git', '', 'allow'), rule('git', 'status', 'allow'), rule('git', 'push', 'ask'), rule('rm', '', 'deny')]
  );
  const permission = generate(ws, claude.id, EMPTY_DEVICE_SETTINGS)?.permission;

  it('预览按属性路径显示完整嵌套的 JSON', () => {
    expect(permission?.preview).toBe(
      [
        '{',
        '  "permissions": {',
        '    "allow": [',
        '      "Bash(git *)",',
        '      "Bash(git status *)"',
        '    ],',
        '    "ask": [',
        '      "Bash(git push *)"',
        '    ],',
        '    "deny": [',
        '      "Bash(rm *)"',
        '    ]',
        '  }',
        '}',
      ].join('\n')
    );
  });

  it('“复制”只复制属性路径最末一段的键值对，不带外层花括号', () => {
    expect(permission?.copyText).toBe(
      [
        '"permissions": {',
        '  "allow": [',
        '    "Bash(git *)",',
        '    "Bash(git status *)"',
        '  ],',
        '  "ask": [',
        '    "Bash(git push *)"',
        '  ],',
        '  "deny": [',
        '    "Bash(rm *)"',
        '  ]',
        '}',
      ].join('\n')
    );
  });

  it('“复制内部”只复制数组元素，以逗号和换行分隔，不带方括号', () => {
    const inner = Object.fromEntries(permission?.decisions.map((d) => [d.decision, d.copyInnerText]) ?? []);
    expect(inner).toEqual({
      allow: '"Bash(git *)",\n"Bash(git status *)"',
      ask: '"Bash(git push *)"',
      deny: '"Bash(rm *)"',
    });
  });

  it('输出中的字符串按 JSON 转义', () => {
    const quoted = generate(workspace(['echo'], [rule('echo', '"hi"', 'allow')]), claude.id, EMPTY_DEVICE_SETTINGS);
    expect(quoted?.permission?.decisions[0]?.copyInnerText).toBe('"Bash(echo \\"hi\\" *)"');
  });
});

describe('生成：空决策', () => {
  const permission = generate(
    workspace(['git'], [rule('git', '', 'allow')]),
    claude.id,
    EMPTY_DEVICE_SETTINGS
  )?.permission;

  it('没有规则的决策仍输出空数组，“复制”可以整体覆盖原属性', () => {
    expect(permission?.copyText).toBe(
      ['"permissions": {', '  "allow": [', '    "Bash(git *)"', '  ],', '  "ask": [],', '  "deny": []', '}'].join('\n')
    );
  });

  it('没有规则的决策，“复制内部”文本为空', () => {
    const empty = permission?.decisions.filter((d) => d.decision !== 'allow');
    expect(empty?.map((d) => ({ decision: d.decision, entries: d.entries, copyInnerText: d.copyInnerText }))).toEqual([
      { decision: 'ask', entries: [], copyInnerText: '' },
      { decision: 'deny', entries: [], copyInnerText: '' },
    ]);
  });
});
