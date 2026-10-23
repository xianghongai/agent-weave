import { describe, expect, it } from 'vitest';

import { generate } from '@/lib/generate';
import { createPresetWorkspace } from '@/lib/presets';
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

/** 在 Claude Code 的基础上改动权限输出，得到另一个 Agent 定义。 */
function agentWith(changes: Partial<NonNullable<Agent['permission_output']>>): Agent {
  const base = claude.permission_output;
  if (!base) {
    throw new Error('基准 Agent 必须有权限输出');
  }
  return { ...claude, permission_output: { ...base, ...changes } };
}

describe('生成：多层属性路径', () => {
  const nested = agentWith({
    property_path: 'userSettings.globalPermissionGrants',
    command_templates: { with_pattern: 'command({command} {pattern})', without_pattern: 'command({command})' },
  });
  const ws = workspace(['git'], [rule('git', '', 'allow'), rule('git', 'push --force', 'deny')], nested);
  const permission = generate(ws, claude.id, EMPTY_DEVICE_SETTINGS)?.permission;

  it('预览按点分的每一段逐层嵌套', () => {
    expect(permission?.preview).toBe(
      [
        '{',
        '  "userSettings": {',
        '    "globalPermissionGrants": {',
        '      "allow": [',
        '        "command(git)"',
        '      ],',
        '      "ask": [],',
        '      "deny": [',
        '        "command(git push --force)"',
        '      ]',
        '    }',
        '  }',
        '}',
      ].join('\n')
    );
  });

  it('“复制”只到属性路径的最末一段', () => {
    expect(permission?.copyText).toBe(
      [
        '"globalPermissionGrants": {',
        '  "allow": [',
        '    "command(git)"',
        '  ],',
        '  "ask": [],',
        '  "deny": [',
        '    "command(git push --force)"',
        '  ]',
        '}',
      ].join('\n')
    );
  });
});

describe('生成：跳过的规则', () => {
  it('决策键名为空时，该决策不出现在输出中，它的规则进入跳过的规则', () => {
    const noAsk = agentWith({ decision_keys: { allow: 'allow', ask: '', deny: 'deny' } });
    const push = rule('git', 'push', 'ask');
    const ws = workspace(['git'], [rule('git', '', 'allow'), push], noAsk);
    const output = generate(ws, claude.id, EMPTY_DEVICE_SETTINGS);

    expect(output?.permission?.decisions.map((d) => d.decision)).toEqual(['allow', 'deny']);
    expect(output?.permission?.copyText).toBe(
      ['"permissions": {', '  "allow": [', '    "Bash(git *)"', '  ],', '  "deny": []', '}'].join('\n')
    );
    expect(output?.skippedRules).toEqual([{ ruleId: push.id, reason: 'decisionKeyMissing' }]);
  });

  it('所需模板为空时，规则进入跳过的规则，另一种模板的规则照常输出', () => {
    const wholeOnly = agentWith({ command_templates: { with_pattern: '', without_pattern: 'Bash({command} *)' } });
    const push = rule('git', 'push', 'deny');
    const ws = workspace(['git'], [rule('git', '', 'allow'), push], wholeOnly);
    const output = generate(ws, claude.id, EMPTY_DEVICE_SETTINGS);

    expect(output?.permission?.decisions.map((d) => [d.decision, d.entries])).toEqual([
      ['allow', ['Bash(git *)']],
      ['ask', []],
      ['deny', []],
    ]);
    expect(output?.skippedRules).toEqual([{ ruleId: push.id, reason: 'templateMissing' }]);
  });

  it('跳过的规则按规则列表的顺序排列', () => {
    const allowOnly = agentWith({
      decision_keys: { allow: 'allow', ask: '', deny: '' },
      command_templates: { with_pattern: 'Bash({command} {pattern} *)', without_pattern: '' },
    });
    const rmDeny = rule('rm', '', 'deny');
    const gitWhole = rule('git', '', 'allow');
    const gitPush = rule('git', 'push', 'ask');
    const ws = workspace(['git', 'rm'], [rmDeny, gitWhole, gitPush], allowOnly);

    expect(generate(ws, claude.id, EMPTY_DEVICE_SETTINGS)?.skippedRules).toEqual([
      { ruleId: gitWhole.id, reason: 'templateMissing' },
      { ruleId: gitPush.id, reason: 'decisionKeyMissing' },
      { ruleId: rmDeny.id, reason: 'decisionKeyMissing' },
    ]);
  });
});

describe('生成：预设 Antigravity', () => {
  const preset = createPresetWorkspace();
  const antigravity = preset.agents.find((agent) => agent.name === 'Antigravity');
  const output = antigravity ? generate(preset, antigravity.id, EMPTY_DEVICE_SETTINGS) : null;

  it('预览显示完整的 userSettings.globalPermissionGrants 嵌套，“复制”只到 globalPermissionGrants', () => {
    expect(output?.permission?.preview.startsWith('{\n  "userSettings": {\n    "globalPermissionGrants": {\n')).toBe(
      true
    );
    expect(output?.permission?.copyText.startsWith('"globalPermissionGrants": {\n  "allow": [\n')).toBe(true);
  });

  it('命令工具写成 command(...)', () => {
    const deny = output?.permission?.decisions.find((d) => d.decision === 'deny');
    expect(deny?.entries).toContain('command(git push --force)');
    expect(deny?.entries).toContain('command(sudo)');
    expect(output?.skippedRules).toEqual([]);
  });

  it('主作用域是共享配置，第二个作用域是 CLI 设置文件并注明其属性名为 permissions', () => {
    const [shared, cli] = output?.permission?.scopes ?? [];
    expect(shared?.path).toBe('~/.gemini/config/config.json');
    expect(cli?.path).toBe('~/.gemini/antigravity-cli/settings.json');
    expect(cli?.note).toContain('permissions');
  });
});

describe('生成：没有权限输出的 Agent', () => {
  it('不输出权限，也不产生跳过的规则', () => {
    const mcpOnly: Agent = { ...claude, permission_output: null };
    const output = generate(workspace(['git'], [rule('git', '', 'allow')], mcpOnly), claude.id, EMPTY_DEVICE_SETTINGS);
    expect(output?.permission).toBeNull();
    expect(output?.skippedRules).toEqual([]);
  });
});
