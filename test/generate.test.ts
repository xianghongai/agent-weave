import { describe, expect, it } from 'vitest';

import { generate } from '@/lib/generate';
import { createPresetWorkspace } from '@/lib/presets';
import {
  type Agent,
  type BuiltInTool,
  type CommandTool,
  type Decision,
  type DeviceSettings,
  EMPTY_DEVICE_SETTINGS,
  type McpServer,
  type Rule,
  type TemplatePair,
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

  it('对预设内置工具写的规则按各自的模板输出，只出现在所属 Agent 中', () => {
    const builtInIds = (name: string) =>
      Object.fromEntries(
        preset.agents.find((agent) => agent.name === name)?.built_in_tools.map((tool) => [tool.key, tool.id]) ?? []
      );
    const claudeTools = builtInIds('Claude Code');
    const antigravityTools = builtInIds('Antigravity');
    const ws: Workspace = {
      ...preset,
      rules: [
        builtInRule('r1', claudeTools.Read ?? '', './src/', 'allow'),
        builtInRule('r2', claudeTools.WebFetch ?? '', 'example.com', 'allow'),
        builtInRule('r3', antigravityTools.write_file ?? '', 'src/', 'allow'),
        builtInRule('r4', antigravityTools.read_url ?? '', '', 'allow'),
      ],
    };
    const allowOf = (agentId: string | undefined) =>
      generate(ws, agentId ?? '', EMPTY_DEVICE_SETTINGS)?.permission?.decisions[0]?.entries;
    expect(allowOf(preset.agents.find((agent) => agent.name === 'Claude Code')?.id)).toEqual([
      'Read(./src/**)',
      'WebFetch(domain:example.com)',
    ]);
    expect(allowOf(antigravity?.id)).toEqual(['read_url(*)', 'write_file(src/)']);
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

describe('生成：预设的 MCP Server', () => {
  const preset = createPresetWorkspace();
  const outputOf = (name: string) => {
    const agent = preset.agents.find((candidate) => candidate.name === name);
    return agent ? generate(preset, agent.id, EMPTY_DEVICE_SETTINGS) : null;
  };
  const claudeCode = outputOf('Claude Code');
  const antigravity = outputOf('Antigravity');

  it('每个预设 MCP Server 都有一条允许整个 Server 的共享规则', () => {
    const allow = (output: typeof claudeCode) => output?.permission?.decisions.find((d) => d.decision === 'allow');
    expect(allow(claudeCode)?.entries).toEqual(expect.arrayContaining(['mcp__context7', 'mcp__filesystem']));
    expect(allow(antigravity)?.entries).toEqual(expect.arrayContaining(['mcp(context7/*)', 'mcp(filesystem/*)']));
  });

  it('Claude Code 与 Antigravity 都输出 JSON 风格的 mcpServers，密钥以 ${VAR} 引用', () => {
    for (const output of [claudeCode, antigravity]) {
      expect(output?.mcp?.style).toBe('json');
      expect(output?.mcp?.copyText.startsWith('"mcpServers": {\n')).toBe(true);
      expect(output?.mcp?.copyText).toContain('"CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"');
    }
  });

  it('MCP 输出带有各自的作用域', () => {
    expect(claudeCode?.mcp?.scopes.map((scope) => scope.path)).toEqual(['.mcp.json', '~/.claude.json']);
    expect(antigravity?.mcp?.scopes.map((scope) => scope.path)).toEqual([
      '~/.gemini/config/mcp_config.json',
      '.agents/mcp_config.json',
    ]);
  });
});

function server(key: string, content: McpServer['content'] = {}, description = ''): McpServer {
  return { id: `server-${key}`, key, content, description, tag_ids: [], high_risk: false };
}

function mcpRule(serverKey: string, pattern: string, decision: Decision): Rule {
  ruleSeq += 1;
  return {
    id: `rule-${ruleSeq}`,
    tool: { type: 'mcp', id: `server-${serverKey}` },
    pattern,
    decision,
    high_risk: false,
  };
}

/** 在命令工具之外再放入若干 MCP Server。 */
function withServers(ws: Workspace, servers: McpServer[]): Workspace {
  return { ...ws, mcp_servers: servers };
}

describe('生成：MCP 规则', () => {
  const rules = [mcpRule('context7', '', 'allow'), mcpRule('context7', 'resolve-library-id', 'ask')];

  it('Claude Code 风格：模式为空时写成 mcp__server，否则写成 mcp__server__tool', () => {
    const ws = withServers(workspace([], rules), [server('context7')]);
    expect(entries(ws, 'allow')).toEqual(['mcp__context7']);
    expect(entries(ws, 'ask')).toEqual(['mcp__context7__resolve-library-id']);
  });

  it('Antigravity 风格：模式为空时写成 mcp(server/*)，否则写成 mcp(server/tool)', () => {
    const antigravity = agentWith({
      mcp_templates: { with_pattern: 'mcp({server}/{pattern})', without_pattern: 'mcp({server}/*)' },
    });
    const ws = withServers(workspace([], rules, antigravity), [server('context7')]);
    expect(entries(ws, 'allow')).toEqual(['mcp(context7/*)']);
    expect(entries(ws, 'ask')).toEqual(['mcp(context7/resolve-library-id)']);
  });

  it('MCP 工具排在命令工具之后，同类之间按标识排序', () => {
    const ws = withServers(
      workspace(['zip'], [mcpRule('memory', '', 'allow'), mcpRule('context7', '', 'allow'), rule('zip', '', 'allow')]),
      [server('memory'), server('context7')]
    );
    expect(entries(ws, 'allow')).toEqual(['Bash(zip *)', 'mcp__context7', 'mcp__memory']);
  });

  it('MCP 工具模板为空时，规则进入跳过的规则', () => {
    const noMcp = agentWith({ mcp_templates: { with_pattern: '', without_pattern: 'mcp__{server}' } });
    const tool = mcpRule('context7', 'query-docs', 'allow');
    const ws = withServers(workspace([], [tool], noMcp), [server('context7')]);
    expect(generate(ws, claude.id, EMPTY_DEVICE_SETTINGS)?.skippedRules).toEqual([
      { ruleId: tool.id, reason: 'templateMissing' },
    ]);
  });
});

describe('生成：JSON 风格的 MCP 输出', () => {
  const jsonOutput: Agent = {
    ...claude,
    mcp_output: {
      style: 'json',
      property_path: 'mcpServers',
      scopes: [{ name: '项目级', path: '.mcp.json', note: '' }],
    },
  };
  const servers = [
    server('memory', { command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'] }, '记忆'),
    server(
      'context7',
      { command: 'npx', args: ['-y', '@upstash/context7-mcp'], env: { CONTEXT7_API_KEY: '${CONTEXT7_API_KEY}' } },
      '查询最新的库文档'
    ),
  ];
  const mcp = generate(withServers(workspace([], [], jsonOutput), servers), claude.id, EMPTY_DEVICE_SETTINGS)?.mcp;

  it('预览按属性路径完整嵌套，Server 按标识排序，描述不进入输出，${VAR} 原样保留', () => {
    expect(mcp?.style).toBe('json');
    expect(mcp?.preview).toBe(
      [
        '{',
        '  "mcpServers": {',
        '    "context7": {',
        '      "command": "npx",',
        '      "args": [',
        '        "-y",',
        '        "@upstash/context7-mcp"',
        '      ],',
        '      "env": {',
        '        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"',
        '      }',
        '    },',
        '    "memory": {',
        '      "command": "npx",',
        '      "args": [',
        '        "-y",',
        '        "@modelcontextprotocol/server-memory"',
        '      ]',
        '    }',
        '  }',
        '}',
      ].join('\n')
    );
  });

  it('“复制”是属性路径最末一段的键值对', () => {
    expect(mcp?.copyText).toBe(
      [
        '"mcpServers": {',
        '  "context7": {',
        '    "command": "npx",',
        '    "args": [',
        '      "-y",',
        '      "@upstash/context7-mcp"',
        '    ],',
        '    "env": {',
        '      "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"',
        '    }',
        '  },',
        '  "memory": {',
        '    "command": "npx",',
        '    "args": [',
        '      "-y",',
        '      "@modelcontextprotocol/server-memory"',
        '    ]',
        '  }',
        '}',
      ].join('\n')
    );
  });

  it('“复制内部”是各 Server 的键值对，以逗号分隔', () => {
    expect(mcp?.copyInnerText).toBe(
      [
        '"context7": {',
        '  "command": "npx",',
        '  "args": [',
        '    "-y",',
        '    "@upstash/context7-mcp"',
        '  ],',
        '  "env": {',
        '    "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"',
        '  }',
        '},',
        '"memory": {',
        '  "command": "npx",',
        '  "args": [',
        '    "-y",',
        '    "@modelcontextprotocol/server-memory"',
        '  ]',
        '}',
      ].join('\n')
    );
  });

  it('附带 Agent 定义中的作用域', () => {
    expect(mcp?.scopes).toEqual([{ name: '项目级', path: '.mcp.json', note: '' }]);
  });

  it('多层属性路径逐层嵌套，“复制”只到最末一段', () => {
    const nested: Agent = { ...jsonOutput, mcp_output: { style: 'json', property_path: 'a.servers', scopes: [] } };
    const output = generate(withServers(workspace([], [], nested), [server('x')]), claude.id, EMPTY_DEVICE_SETTINGS);
    expect(output?.mcp?.preview).toBe('{\n  "a": {\n    "servers": {\n      "x": {}\n    }\n  }\n}');
    expect(output?.mcp?.copyText).toBe('"servers": {\n  "x": {}\n}');
  });

  it('没有 MCP Server 时输出空对象，“复制内部”为空', () => {
    const output = generate(workspace([], [], jsonOutput), claude.id, EMPTY_DEVICE_SETTINGS);
    expect(output?.mcp?.copyText).toBe('"mcpServers": {}');
    expect(output?.mcp?.copyInnerText).toBe('');
  });

  it('内容中自带的 description 字段属于内容，原样输出', () => {
    const output = generate(
      withServers(workspace([], [], jsonOutput), [server('x', { description: '内容里的' }, 'Server 描述')]),
      claude.id,
      EMPTY_DEVICE_SETTINGS
    );
    expect(output?.mcp?.copyInnerText).toBe('"x": {\n  "description": "内容里的"\n}');
  });

  it('没有 MCP 输出的 Agent 不输出 MCP 节', () => {
    const output = generate(withServers(workspace([], []), servers), claude.id, EMPTY_DEVICE_SETTINGS);
    expect(output?.mcp).toBeNull();
  });
});

function builtIn(id: string, key: string, templates: TemplatePair): BuiltInTool {
  return { id, key, description: '', tag_ids: [], high_risk: false, writes: false, templates };
}

function builtInRule(id: string, toolId: string, pattern: string, decision: Decision): Rule {
  return { id, tool: { type: 'built_in', id: toolId }, pattern, decision, high_risk: false };
}

describe('生成：内置工具', () => {
  /** 两个各带内置工具的 Agent，外加一条共享的命令工具规则。 */
  const claudeWithTools: Agent = {
    ...claude,
    built_in_tools: [
      builtIn('read', 'Read', { with_pattern: 'Read({pattern}**)', without_pattern: 'Read' }),
      builtIn('web-search', 'WebSearch', { with_pattern: '', without_pattern: 'WebSearch' }),
    ],
  };
  const antigravity: Agent = {
    ...agentWith({
      property_path: 'userSettings.globalPermissionGrants',
      command_templates: { with_pattern: 'command({command} {pattern})', without_pattern: 'command({command})' },
    }),
    id: 'agent-antigravity',
    name: 'Antigravity',
    built_in_tools: [
      builtIn('read-file', 'read_file', { with_pattern: 'read_file({pattern})', without_pattern: 'read_file(*)' }),
    ],
  };
  const ws: Workspace = {
    ...workspace(['git'], []),
    agents: [claudeWithTools, antigravity],
    rules: [
      builtInRule('claude-read-src', 'read', './src/', 'allow'),
      builtInRule('antigravity-read', 'read-file', '', 'allow'),
      rule('git', '', 'allow'),
    ],
  };

  function allowOf(agentId: string): string[] {
    return generate(ws, agentId, EMPTY_DEVICE_SETTINGS)?.permission?.decisions[0]?.entries ?? [];
  }

  it('内置工具的规则只出现在所属 Agent 的输出中，共享规则出现在所有 Agent 中', () => {
    expect(allowOf(claude.id)).toEqual(['Bash(git *)', 'Read(./src/**)']);
    expect(allowOf(antigravity.id)).toEqual(['command(git)', 'read_file(*)']);
  });

  it('按模式是否为空选用内置工具自己的模板，以 / 结尾的目录前缀由模板补全 glob', () => {
    const both: Workspace = {
      ...ws,
      rules: [
        builtInRule('read-all', 'read', '', 'ask'),
        builtInRule('read-docs', 'read', './docs/', 'ask'),
        builtInRule('read-file-src', 'read-file', 'src/', 'ask'),
      ],
    };
    const ask = (agentId: string) =>
      generate(both, agentId, EMPTY_DEVICE_SETTINGS)?.permission?.decisions.find((d) => d.decision === 'ask')?.entries;
    expect(ask(claude.id)).toEqual(['Read', 'Read(./docs/**)']);
    expect(ask(antigravity.id)).toEqual(['read_file(src/)']);
  });

  it('所需模板为空时只在所属 Agent 中跳过，其他 Agent 不受影响', () => {
    const search: Workspace = {
      ...ws,
      rules: [
        builtInRule('search-docs', 'web-search', 'docs', 'allow'),
        builtInRule('search', 'web-search', '', 'deny'),
      ],
    };
    const claudeOutput = generate(search, claude.id, EMPTY_DEVICE_SETTINGS);
    expect(claudeOutput?.skippedRules).toEqual([{ ruleId: 'search-docs', reason: 'templateMissing' }]);
    expect(claudeOutput?.permission?.decisions.find((d) => d.decision === 'deny')?.entries).toEqual(['WebSearch']);

    const antigravityOutput = generate(search, antigravity.id, EMPTY_DEVICE_SETTINGS);
    expect(antigravityOutput?.skippedRules).toEqual([]);
    expect(antigravityOutput?.permission?.decisions.map((d) => d.entries)).toEqual([[], [], []]);
  });

  it('内置工具的规则排在命令工具之后，与标识的字母顺序无关', () => {
    const ordered: Workspace = {
      ...workspace(['zip'], []),
      agents: [claudeWithTools],
      rules: [builtInRule('read-all', 'read', '', 'allow'), rule('zip', '', 'allow')],
    };
    expect(generate(ordered, claude.id, EMPTY_DEVICE_SETTINGS)?.permission?.decisions[0]?.entries).toEqual([
      'Bash(zip *)',
      'Read',
    ]);
  });
});

describe('生成：路径占位符', () => {
  const linux: DeviceSettings = { os: 'linux', user_name: 'alice' };

  it('Linux 上 {{home}} 展开为 /home/<用户名>，规则模式中的占位符随之展开', () => {
    const ws = workspace(['ls'], [rule('ls', '{{home}}/projects', 'allow')]);
    const output = generate(ws, claude.id, linux);
    expect(output?.permission?.decisions[0]?.entries).toEqual(['Bash(ls /home/alice/projects *)']);
    expect(output?.notices).toEqual([]);
  });

  it.each([
    ['macOS', { os: 'macos', user_name: 'alice' }, 'Bash(ls /Users/alice/projects/alice *)'],
    ['Windows', { os: 'windows', user_name: 'alice' }, 'Bash(ls C:\\Users\\alice/projects/alice *)'],
    ['用户名前后的空白不计入', { os: 'linux', user_name: ' alice ' }, 'Bash(ls /home/alice/projects/alice *)'],
  ] satisfies [string, DeviceSettings, string][])(
    '%s：{{home}} 按操作系统展开，{{user}} 展开为用户名',
    (_, device, expected) => {
      const ws = workspace(['ls'], [rule('ls', '{{home}}/projects/{{user}}', 'allow')]);
      expect(generate(ws, claude.id, device)?.permission?.decisions[0]?.entries).toEqual([expected]);
    }
  );

  it.each([
    ['没有本机设置', EMPTY_DEVICE_SETTINGS],
    ['没有选择操作系统', { os: null, user_name: 'alice' }],
    ['用户名为空白', { os: 'macos', user_name: '  ' }],
  ] satisfies [string, DeviceSettings][])('%s时占位符原样保留，每条相关规则产生一条提示', (_, device) => {
    const home = rule('ls', '{{home}}/projects/{{user}}', 'allow');
    const plain = rule('ls', '/tmp', 'allow');
    const output = generate(workspace(['ls'], [home, plain]), claude.id, device);
    expect(output?.permission?.decisions[0]?.entries).toEqual(['Bash(ls /tmp *)', 'Bash(ls {{home}}/projects/{{user}} *)']);
    expect(output?.notices).toEqual([{ type: 'placeholderUnexpanded', ruleId: home.id, serverId: null }]);
  });

  it('跳过的规则不进入输出，也不产生占位符提示', () => {
    const noAsk: Agent = {
      ...claude,
      permission_output: claude.permission_output && {
        ...claude.permission_output,
        decision_keys: { allow: 'allow', ask: '', deny: 'deny' },
      },
    };
    const ws = workspace(['ls'], [rule('ls', '{{home}}', 'ask')], noAsk);
    expect(generate(ws, claude.id, EMPTY_DEVICE_SETTINGS)?.notices).toEqual([]);
  });

  it('${VAR} 不是路径占位符，设置完整与否都原样输出且不提示', () => {
    const ws = workspace(['ls'], [rule('ls', '${HOME}/projects', 'allow')]);
    for (const device of [linux, EMPTY_DEVICE_SETTINGS]) {
      const output = generate(ws, claude.id, device);
      expect(output?.permission?.decisions[0]?.entries).toEqual(['Bash(ls ${HOME}/projects *)']);
      expect(output?.notices).toEqual([]);
    }
  });

  describe('MCP Server 内容', () => {
    const mcpAgent: Agent = { ...claude, mcp_output: { style: 'json', property_path: 'mcpServers', scopes: [] } };
    const filesystem = server('filesystem', {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '{{home}}/notes'],
      env: { OWNER: '{{user}}', TOKEN: '${FS_TOKEN}', nested: { roots: [{ path: '{{home}}' }], retries: 3, debug: null } },
    });
    const plain = server('plain', { command: 'uvx', args: ['plain'] });
    const ws = withServers(workspace([], [], mcpAgent), [plain, filesystem]);

    it('展开嵌套在对象和数组中的所有字符串值，数字、null 和 ${VAR} 原样保留', () => {
      const output = generate(ws, claude.id, { os: 'windows', user_name: 'alice' });
      expect(output?.mcp?.copyInnerText?.split(',\n"plain"')[0]).toBe(
        [
          '"filesystem": {',
          '  "command": "npx",',
          '  "args": [',
          '    "-y",',
          '    "@modelcontextprotocol/server-filesystem",',
          '    "C:\\\\Users\\\\alice/notes"',
          '  ],',
          '  "env": {',
          '    "OWNER": "alice",',
          '    "TOKEN": "${FS_TOKEN}",',
          '    "nested": {',
          '      "roots": [',
          '        {',
          '          "path": "C:\\\\Users\\\\alice"',
          '        }',
          '      ],',
          '      "retries": 3,',
          '      "debug": null',
          '    }',
          '  }',
          '}',
        ].join('\n')
      );
      expect(output?.mcp?.preview).toContain('"OWNER": "alice"');
      expect(output?.notices).toEqual([]);
    });

    it('本机设置不完整时内容原样输出，含占位符的每个 Server 产生一条提示', () => {
      const output = generate(ws, claude.id, EMPTY_DEVICE_SETTINGS);
      expect(output?.mcp?.copyText).toContain('"{{home}}/notes"');
      expect(output?.mcp?.copyText).toContain('"OWNER": "{{user}}"');
      expect(output?.notices).toEqual([{ type: 'placeholderUnexpanded', ruleId: null, serverId: filesystem.id }]);
    });

    it('没有 MCP 输出的 Agent 不提示 Server 内容中的占位符', () => {
      const noMcp = { ...ws, agents: [claude] };
      expect(generate(noMcp, claude.id, EMPTY_DEVICE_SETTINGS)?.notices).toEqual([]);
    });

    it('规则的提示在前，Server 的提示在后', () => {
      const home = rule('ls', '{{home}}', 'allow');
      const both = { ...ws, command_tools: [tool('ls')], rules: [home] };
      expect(generate(both, claude.id, EMPTY_DEVICE_SETTINGS)?.notices).toEqual([
        { type: 'placeholderUnexpanded', ruleId: home.id, serverId: null },
        { type: 'placeholderUnexpanded', ruleId: null, serverId: filesystem.id },
      ]);
    });

    it('预设 filesystem 的根目录在 Linux 上展开为用户主目录', () => {
      const preset = createPresetWorkspace();
      const agent = preset.agents.find((candidate) => candidate.name === 'Claude Code');
      const output = generate(preset, agent?.id ?? '', linux);
      expect(output?.mcp?.copyText).toContain('"/home/alice"');
      expect(output?.mcp?.copyText).not.toContain('{{home}}');
    });
  });
});
