import { describe, expect, it } from 'vitest';

import { generate } from '@/lib/generate';
import { EMPTY_DEVICE_SETTINGS, type McpOutput, type PermissionOutput, type Workspace } from '@/lib/workspace';
import {
  type AgentInput,
  type OperationContext,
  addAgent,
  addCommandTool,
  addMcpServer,
  addRule,
  countRulesForAgent,
  countRulesForTool,
  deleteAgent,
  deleteCommandTool,
  deleteMcpServer,
  deleteRule,
  listRules,
  newPermissionOutput,
  updateAgent,
  updateCommandTool,
  updateMcpServer,
  updateRule,
} from '@/lib/workspace-operations';

const BEFORE = '2026-01-01T00:00:00.000Z';
const NOW = '2026-10-23T12:00:00.000Z';

/** 固定时间、按顺序编号的上下文，让结果可以逐字断言。 */
function context(): OperationContext {
  let seq = 0;
  return {
    now: () => NOW,
    newId: () => {
      seq += 1;
      return `new-${seq}`;
    },
  };
}

const empty: Workspace = {
  schema_version: 1,
  updated_at: BEFORE,
  tags: [],
  command_tools: [],
  mcp_servers: [],
  agents: [
    {
      id: 'agent-claude',
      name: 'Claude Code',
      description: '',
      built_in_tools: [],
      permission_output: {
        property_path: 'permissions',
        scopes: [],
        decision_keys: { allow: 'allow', ask: 'ask', deny: 'deny' },
        command_templates: { with_pattern: 'Bash({command} {pattern} *)', without_pattern: 'Bash({command} *)' },
        mcp_templates: { with_pattern: '', without_pattern: '' },
      },
      mcp_output: null,
    },
  ],
  rules: [],
};

/** 依次执行操作，任何一步返回原因码都让用例失败。 */
function apply(workspace: Workspace, ...steps: ((ws: Workspace) => ReturnType<typeof addCommandTool>)[]): Workspace {
  return steps.reduce((ws, step) => {
    const result = step(ws);
    if ('problem' in result) {
      throw new Error(`操作失败：${result.problem}`);
    }
    return result.workspace;
  }, workspace);
}

function allowEntries(ws: Workspace): string[] {
  return generate(ws, 'agent-claude', EMPTY_DEVICE_SETTINGS)?.permission?.decisions[0]?.entries ?? [];
}

/** 带 Claude Code MCP 工具模板的工作区。 */
const withMcpTemplates: Workspace = {
  ...empty,
  agents: empty.agents.map((agent) => ({
    ...agent,
    permission_output: agent.permission_output && {
      ...agent.permission_output,
      mcp_templates: { with_pattern: 'mcp__{server}__{pattern}', without_pattern: 'mcp__{server}' },
    },
  })),
};

describe('工作区操作：命令工具', () => {
  it('新增命令工具时去掉首尾空白，并更新修改时间', () => {
    const ctx = context();
    const ws = apply(empty, (w) => addCommandTool(w, { key: ' git ', description: ' 版本控制 ' }, ctx));
    expect(ws.command_tools).toEqual([
      { id: 'new-1', key: 'git', description: '版本控制', tag_ids: [], high_risk: false },
    ]);
    expect(ws.updated_at).toBe(NOW);
  });

  it('标识为空时返回原因码', () => {
    expect(addCommandTool(empty, { key: '  ', description: '' }, context())).toEqual({ problem: 'keyEmpty' });
  });

  it('标识与已有命令工具重复时返回原因码', () => {
    const ctx = context();
    const ws = apply(empty, (w) => addCommandTool(w, { key: 'git', description: '' }, ctx));
    expect(addCommandTool(ws, { key: 'git', description: '另一个' }, ctx)).toEqual({ problem: 'keyDuplicate' });
  });

  it('编辑时可以保留自己的标识，但不能改成别人的标识', () => {
    const ctx = context();
    const ws = apply(
      empty,
      (w) => addCommandTool(w, { key: 'git', description: '' }, ctx),
      (w) => addCommandTool(w, { key: 'pnpm', description: '' }, ctx)
    );
    const kept = apply(ws, (w) => updateCommandTool(w, 'new-1', { key: 'git', description: '版本控制' }, ctx));
    expect(kept.command_tools[0]).toMatchObject({ key: 'git', description: '版本控制' });
    expect(updateCommandTool(ws, 'new-1', { key: 'pnpm', description: '' }, ctx)).toEqual({
      problem: 'keyDuplicate',
    });
  });

  it('编辑不存在的命令工具时返回原因码', () => {
    expect(updateCommandTool(empty, 'missing', { key: 'git', description: '' }, context())).toEqual({
      problem: 'notFound',
    });
  });

  it('修改标识后，引用它的规则的输出随之变化', () => {
    const ctx = context();
    const ws = apply(
      empty,
      (w) => addCommandTool(w, { key: 'npm', description: '' }, ctx),
      (w) => addRule(w, { tool: { type: 'command', id: 'new-1' }, pattern: 'install', decision: 'allow' }, ctx),
      (w) => updateCommandTool(w, 'new-1', { key: 'pnpm', description: '' }, ctx)
    );
    expect(allowEntries(ws)).toEqual(['Bash(pnpm install *)']);
  });

  it('删除命令工具时连同引用它的规则一起删除，删除前可以查询受影响的规则数量', () => {
    const ctx = context();
    const ws = apply(
      empty,
      (w) => addCommandTool(w, { key: 'git', description: '' }, ctx),
      (w) => addCommandTool(w, { key: 'ls', description: '' }, ctx),
      (w) => addRule(w, { tool: { type: 'command', id: 'new-1' }, pattern: '', decision: 'allow' }, ctx),
      (w) => addRule(w, { tool: { type: 'command', id: 'new-1' }, pattern: 'push', decision: 'ask' }, ctx),
      (w) => addRule(w, { tool: { type: 'command', id: 'new-2' }, pattern: '', decision: 'allow' }, ctx)
    );
    expect(countRulesForTool(ws, { type: 'command', id: 'new-1' })).toBe(2);
    expect(countRulesForTool(ws, { type: 'command', id: 'new-2' })).toBe(1);

    const deleted = apply(ws, (w) => deleteCommandTool(w, 'new-1', ctx));
    expect(deleted.command_tools.map((tool) => tool.key)).toEqual(['ls']);
    expect(deleted.rules.map((rule) => rule.id)).toEqual(['new-5']);
    expect(allowEntries(deleted)).toEqual(['Bash(ls *)']);
  });
});

describe('工作区操作：MCP Server', () => {
  const context7 = '{ "command": "npx", "args": ["-y", "@upstash/context7-mcp"] }';

  it('新增 MCP Server 时解析 JSON 内容，去掉标识和描述首尾的空白，并更新修改时间', () => {
    const ws = apply(empty, (w) =>
      addMcpServer(w, { key: ' context7 ', content: context7, description: ' 查询文档 ' }, context())
    );
    expect(ws.mcp_servers).toEqual([
      {
        id: 'new-1',
        key: 'context7',
        content: { command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
        description: '查询文档',
        tag_ids: [],
        high_risk: false,
      },
    ]);
    expect(ws.updated_at).toBe(NOW);
  });

  it('内容不是合法的 JSON 对象时返回原因码', () => {
    for (const content of ['', '{ "command": ', '"context7": {}', '[]', 'null', '42']) {
      expect(addMcpServer(empty, { key: 'context7', content, description: '' }, context())).toEqual({
        problem: 'contentInvalid',
      });
    }
  });

  it('内容中的字段不做校验，只要是 JSON 对象就可以保存', () => {
    const ws = apply(empty, (w) =>
      addMcpServer(w, { key: 'odd', content: '{ "anything": [null] }', description: '' }, context())
    );
    expect(ws.mcp_servers[0]?.content).toEqual({ anything: [null] });
  });

  it('标识为空或与其他 MCP Server 重复时返回原因码，与命令工具同名不算重复', () => {
    const ctx = context();
    const ws = apply(
      empty,
      (w) => addCommandTool(w, { key: 'git', description: '' }, ctx),
      (w) => addMcpServer(w, { key: 'context7', content: '{}', description: '' }, ctx)
    );
    expect(addMcpServer(ws, { key: ' ', content: '{}', description: '' }, ctx)).toEqual({ problem: 'keyEmpty' });
    expect(addMcpServer(ws, { key: 'context7', content: '{}', description: '' }, ctx)).toEqual({
      problem: 'keyDuplicate',
    });
    expect('workspace' in addMcpServer(ws, { key: 'git', content: '{}', description: '' }, ctx)).toBe(true);
  });

  it('编辑时可以保留自己的标识并替换内容，但不能改成别人的标识', () => {
    const ctx = context();
    const ws = apply(
      empty,
      (w) => addMcpServer(w, { key: 'context7', content: '{}', description: '' }, ctx),
      (w) => addMcpServer(w, { key: 'memory', content: '{}', description: '' }, ctx)
    );
    const edited = apply(ws, (w) =>
      updateMcpServer(w, 'new-1', { key: 'context7', content: context7, description: '文档' }, ctx)
    );
    expect(edited.mcp_servers[0]).toMatchObject({
      key: 'context7',
      content: { command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
      description: '文档',
    });
    expect(updateMcpServer(ws, 'new-1', { key: 'memory', content: '{}', description: '' }, ctx)).toEqual({
      problem: 'keyDuplicate',
    });
    expect(updateMcpServer(ws, 'new-1', { key: 'context7', content: '[', description: '' }, ctx)).toEqual({
      problem: 'contentInvalid',
    });
    expect(updateMcpServer(ws, 'missing', { key: 'x', content: '{}', description: '' }, ctx)).toEqual({
      problem: 'notFound',
    });
  });

  it('可以对 MCP Server 写规则，修改标识后输出随之变化', () => {
    const ctx = context();
    const ws = apply(
      withMcpTemplates,
      (w) => addMcpServer(w, { key: 'context7', content: '{}', description: '' }, ctx),
      (w) => addRule(w, { tool: { type: 'mcp', id: 'new-1' }, pattern: '', decision: 'allow' }, ctx),
      (w) => updateMcpServer(w, 'new-1', { key: 'docs', content: '{}', description: '' }, ctx)
    );
    expect(allowEntries(ws)).toEqual(['mcp__docs']);
  });

  it('删除 MCP Server 时连同引用它的规则一起删除，删除前可以查询受影响的规则数量', () => {
    const ctx = context();
    const ws = apply(
      withMcpTemplates,
      (w) => addMcpServer(w, { key: 'context7', content: '{}', description: '' }, ctx),
      (w) => addMcpServer(w, { key: 'memory', content: '{}', description: '' }, ctx),
      (w) => addRule(w, { tool: { type: 'mcp', id: 'new-1' }, pattern: '', decision: 'allow' }, ctx),
      (w) => addRule(w, { tool: { type: 'mcp', id: 'new-1' }, pattern: 'resolve-library-id', decision: 'ask' }, ctx),
      (w) => addRule(w, { tool: { type: 'mcp', id: 'new-2' }, pattern: '', decision: 'allow' }, ctx)
    );
    expect(countRulesForTool(ws, { type: 'mcp', id: 'new-1' })).toBe(2);

    const deleted = apply(ws, (w) => deleteMcpServer(w, 'new-1', ctx));
    expect(deleted.mcp_servers.map((server) => server.key)).toEqual(['memory']);
    expect(deleted.rules.map((rule) => rule.id)).toEqual(['new-5']);
    expect(allowEntries(deleted)).toEqual(['mcp__memory']);
    expect(deleteMcpServer(deleted, 'new-1', ctx)).toEqual({ problem: 'notFound' });
  });

  it('所选 MCP Server 不存在时不能新增规则', () => {
    const missing = { tool: { type: 'mcp', id: 'missing' }, pattern: '', decision: 'allow' } as const;
    expect(addRule(empty, missing, context())).toEqual({ problem: 'toolMissing' });
  });
});

describe('工作区操作：权限规则', () => {
  const ctx = context();
  const withGit = apply(empty, (w) => addCommandTool(w, { key: 'git', description: '' }, ctx));
  const git = { type: 'command', id: 'new-1' } as const;

  it('新增规则时去掉模式首尾的空白，模式可以为空', () => {
    const ws = apply(
      withGit,
      (w) => addRule(w, { tool: git, pattern: ' push --force ', decision: 'deny' }, context()),
      (w) => addRule(w, { tool: git, pattern: '', decision: 'allow' }, context())
    );
    expect(ws.rules.map(({ pattern, decision, high_risk }) => ({ pattern, decision, high_risk }))).toEqual([
      { pattern: 'push --force', decision: 'deny', high_risk: false },
      { pattern: '', decision: 'allow', high_risk: false },
    ]);
  });

  it('所选工具不存在时返回原因码', () => {
    expect(
      addRule(withGit, { tool: { type: 'command', id: 'missing' }, pattern: '', decision: 'allow' }, context())
    ).toEqual({ problem: 'toolMissing' });
  });

  it('可以修改规则的模式和决策，规则列表重新排序', () => {
    const local = context();
    const ws = apply(
      empty,
      (w) => addCommandTool(w, { key: 'git', description: '' }, local),
      (w) => addRule(w, { tool: git, pattern: 'status', decision: 'allow' }, local),
      (w) => addRule(w, { tool: git, pattern: 'log', decision: 'allow' }, local),
      (w) => updateRule(w, 'new-2', { tool: git, pattern: 'push', decision: 'ask' }, local)
    );
    expect(listRules(ws).map(({ rule }) => `${rule.pattern}:${rule.decision}`)).toEqual(['log:allow', 'push:ask']);
  });

  it('可以删除规则', () => {
    const local = context();
    const ws = apply(
      empty,
      (w) => addCommandTool(w, { key: 'git', description: '' }, local),
      (w) => addRule(w, { tool: git, pattern: '', decision: 'allow' }, local),
      (w) => deleteRule(w, 'new-2', local)
    );
    expect(ws.rules).toEqual([]);
    expect(ws.updated_at).toBe(NOW);
  });
});

/** Antigravity 风格的权限输出，用于新增、编辑 Agent 的用例。 */
const grants: PermissionOutput = {
  property_path: 'userSettings.globalPermissionGrants',
  scopes: [{ name: '共享配置', path: '~/.gemini/config/config.json', note: '' }],
  decision_keys: { allow: 'allow', ask: 'ask', deny: 'deny' },
  command_templates: { with_pattern: 'command({command} {pattern})', without_pattern: 'command({command})' },
  mcp_templates: { with_pattern: 'mcp({server}/{pattern})', without_pattern: 'mcp({server}/*)' },
};

function agentInput(changes: Partial<AgentInput> = {}): AgentInput {
  return { name: 'Antigravity', description: '', permission_output: grants, mcp_output: null, ...changes };
}

/** 带一个内置工具 `Read` 的 Claude Code。 */
const withRead: Workspace = {
  ...empty,
  agents: empty.agents.map((agent) => ({
    ...agent,
    built_in_tools: [
      {
        id: 'read',
        key: 'Read',
        description: '',
        tag_ids: [],
        high_risk: false,
        writes: false,
        templates: { with_pattern: 'Read({pattern})', without_pattern: 'Read' },
      },
    ],
  })),
};

describe('工作区操作：Agent', () => {
  it('新 Agent 的决策键名映射默认为 allow、ask、deny', () => {
    expect(newPermissionOutput().decision_keys).toEqual({ allow: 'allow', ask: 'ask', deny: 'deny' });
  });

  it('新增 Agent 时去掉各字段首尾的空白，丢弃全部为空的作用域，并更新修改时间', () => {
    const input = agentInput({
      name: ' Antigravity ',
      description: ' 共享配置 ',
      permission_output: {
        ...grants,
        property_path: ' userSettings.globalPermissionGrants ',
        scopes: [
          { name: ' 共享配置 ', path: ' ~/.gemini/config/config.json ', note: ' IDE、CLI 共用 ' },
          { name: ' ', path: '', note: '' },
        ],
        decision_keys: { allow: ' allow ', ask: '', deny: 'deny' },
      },
    });
    const ws = apply(empty, (w) => addAgent(w, input, context()));
    expect(ws.agents[1]).toEqual({
      id: 'new-1',
      name: 'Antigravity',
      description: '共享配置',
      built_in_tools: [],
      permission_output: {
        ...grants,
        scopes: [{ name: '共享配置', path: '~/.gemini/config/config.json', note: 'IDE、CLI 共用' }],
        decision_keys: { allow: 'allow', ask: '', deny: 'deny' },
      },
      mcp_output: null,
    });
    expect(ws.updated_at).toBe(NOW);
  });

  it('新增的 Agent 立即可以生成输出', () => {
    const ctx = context();
    const ws = apply(
      empty,
      (w) => addCommandTool(w, { key: 'git', description: '' }, ctx),
      (w) => addRule(w, { tool: { type: 'command', id: 'new-1' }, pattern: 'status', decision: 'allow' }, ctx),
      (w) => addAgent(w, agentInput(), ctx)
    );
    expect(generate(ws, 'new-3', EMPTY_DEVICE_SETTINGS)?.permission?.decisions[0]?.entries).toEqual([
      'command(git status)',
    ]);
  });

  it('名称为空或与其他 Agent 重复时返回原因码', () => {
    expect(addAgent(empty, agentInput({ name: ' ' }), context())).toEqual({ problem: 'nameEmpty' });
    expect(addAgent(empty, agentInput({ name: 'Claude Code' }), context())).toEqual({ problem: 'nameDuplicate' });
  });

  it('属性路径为空或含有空段时返回原因码', () => {
    for (const property_path of ['', ' ', 'a..b', '.permissions', 'permissions.']) {
      expect(addAgent(empty, agentInput({ permission_output: { ...grants, property_path } }), context())).toEqual({
        problem: 'propertyPathInvalid',
      });
    }
    const mcp_output: McpOutput = { style: 'json', property_path: 'mcp..servers', scopes: [] };
    expect(addAgent(empty, agentInput({ mcp_output }), context())).toEqual({ problem: 'propertyPathInvalid' });
  });

  it('两个决策映射到同一个键名时返回原因码，留空的决策不算重复', () => {
    const duplicate = { ...grants, decision_keys: { allow: 'allow', ask: 'allow', deny: 'deny' } };
    expect(addAgent(empty, agentInput({ permission_output: duplicate }), context())).toEqual({
      problem: 'decisionKeyDuplicate',
    });
    const blanks = { ...grants, decision_keys: { allow: 'allow', ask: '', deny: '' } };
    expect('workspace' in addAgent(empty, agentInput({ permission_output: blanks }), context())).toBe(true);
  });

  it('可以没有权限输出', () => {
    const ws = apply(empty, (w) => addAgent(w, agentInput({ permission_output: null }), context()));
    expect(ws.agents[1]?.permission_output).toBeNull();
    expect(generate(ws, 'new-1', EMPTY_DEVICE_SETTINGS)?.permission).toBeNull();
  });

  it('编辑时可以保留自己的名称，但不能改成别人的名称，内置工具保持不变', () => {
    const ctx = context();
    const ws = apply(
      withRead,
      (w) => addAgent(w, agentInput(), ctx),
      (w) => updateAgent(w, 'agent-claude', agentInput({ name: 'Claude Code', description: '命令行' }), ctx)
    );
    expect(ws.agents[0]).toMatchObject({ name: 'Claude Code', description: '命令行', permission_output: grants });
    expect(ws.agents[0]?.built_in_tools.map((tool) => tool.key)).toEqual(['Read']);
    expect(updateAgent(ws, 'agent-claude', agentInput(), ctx)).toEqual({ problem: 'nameDuplicate' });
  });

  it('编辑不存在的 Agent 时返回原因码', () => {
    expect(updateAgent(empty, 'missing', agentInput(), context())).toEqual({ problem: 'notFound' });
  });

  it('删除 Agent 时连同它的内置工具和指向这些内置工具的规则一起删除，共享规则保留', () => {
    const ws: Workspace = {
      ...withRead,
      command_tools: [{ id: 'git', key: 'git', description: '', tag_ids: [], high_risk: false }],
      rules: [
        { id: 'r1', tool: { type: 'command', id: 'git' }, pattern: '', decision: 'allow', high_risk: false },
        { id: 'r2', tool: { type: 'built_in', id: 'read' }, pattern: './src/', decision: 'allow', high_risk: false },
        { id: 'r3', tool: { type: 'built_in', id: 'read' }, pattern: '', decision: 'ask', high_risk: false },
      ],
    };
    expect(countRulesForAgent(ws, 'agent-claude')).toBe(2);

    const deleted = apply(ws, (w) => deleteAgent(w, 'agent-claude', context()));
    expect(deleted.agents).toEqual([]);
    expect(deleted.rules.map((rule) => rule.id)).toEqual(['r1']);
    expect(deleted.updated_at).toBe(NOW);
  });

  it('删除不存在的 Agent 时返回原因码', () => {
    expect(deleteAgent(empty, 'missing', context())).toEqual({ problem: 'notFound' });
  });
});
