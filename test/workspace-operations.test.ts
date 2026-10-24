import { describe, expect, it } from 'vitest';

import { generate } from '@/lib/generate';
import { createPresetWorkspace } from '@/lib/presets';
import { EMPTY_DEVICE_SETTINGS, type McpOutput, type PermissionOutput, type Workspace } from '@/lib/workspace';
import {
  type AgentInput,
  type BuiltInToolInput,
  NO_RULE_FILTER,
  type OperationContext,
  type RuleFilter,
  type ToolFilter,
  addAgent,
  addBuiltInTool,
  addCommandTool,
  addMcpServer,
  addRule,
  addTag,
  countRulesForAgent,
  countRulesForTool,
  countToolsForTag,
  deleteAgent,
  deleteBuiltInTool,
  deleteCommandTool,
  deleteMcpServer,
  deleteRule,
  deleteTag,
  findSelectedAgent,
  groupRulesByTool,
  listRules,
  matchesRuleFilter,
  matchesToolFilter,
  newMcpOutput,
  newPermissionOutput,
  resolveTags,
  totalToolCount,
  updateAgent,
  updateBuiltInTool,
  updateCommandTool,
  updateMcpServer,
  updateRule,
  updateTag,
} from '@/lib/workspace-operations';
import { parseWorkspace } from '@/lib/workspace-validation';

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
      { id: 'new-1', key: 'git', description: '版本控制', tag_ids: [], high_risk: false, high_risk_reason: '' },
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
        high_risk_reason: '',
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

  it('同一工具、模式和决策的规则不能重复，模式比较时去掉首尾空白；决策不同时允许（只给冲突提示）', () => {
    const local = context();
    const ws = apply(withGit, (w) => addRule(w, { tool: git, pattern: 'push', decision: 'ask' }, local));
    expect(addRule(ws, { tool: git, pattern: ' push ', decision: 'ask' }, context())).toEqual({
      problem: 'ruleDuplicate',
    });
    expect('workspace' in addRule(ws, { tool: git, pattern: 'push', decision: 'deny' }, context())).toBe(true);
    const two = apply(ws, (w) => addRule(w, { tool: git, pattern: 'status', decision: 'ask' }, local));
    // 编辑时可以保持自己不变，但不能改成与另一条相同。
    expect('workspace' in updateRule(two, 'new-1', { tool: git, pattern: 'push', decision: 'ask' }, local)).toBe(true);
    expect(updateRule(two, 'new-2', { tool: git, pattern: 'push', decision: 'ask' }, local)).toEqual({
      problem: 'ruleDuplicate',
    });
  });

  it('尚未选择工具时返回原因码', () => {
    const input = { tool: null, pattern: '', decision: 'allow' } as const;
    expect(addRule(withGit, input, context())).toEqual({ problem: 'toolEmpty' });
    const ws = apply(withGit, (w) => addRule(w, { tool: git, pattern: '', decision: 'allow' }, context()));
    expect(updateRule(ws, 'new-1', input, context())).toEqual({ problem: 'toolEmpty' });
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
        high_risk_reason: '',
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
  });

  it('MCP 输出的属性路径无效时返回单独的原因码，便于界面定位到对应字段', () => {
    for (const property_path of ['', 'mcp..servers', 'mcpServers.']) {
      const mcp_output: McpOutput = { style: 'json', property_path, scopes: [] };
      expect(addAgent(empty, agentInput({ mcp_output }), context())).toEqual({ problem: 'mcpPropertyPathInvalid' });
    }
  });

  it('可以设置 MCP 输出：去掉属性路径与作用域首尾的空白，丢弃全部为空的作用域', () => {
    const mcp_output: McpOutput = {
      style: 'toml',
      property_path: ' mcp_servers ',
      scopes: [
        { name: ' 用户级 ', path: ' ~/.codex/config.toml ', note: '' },
        { name: '', path: ' ', note: '' },
      ],
    };
    const ws = apply(empty, (w) => addAgent(w, agentInput({ permission_output: null, mcp_output }), context()));
    expect(ws.agents[1]?.mcp_output).toEqual({
      style: 'toml',
      property_path: 'mcp_servers',
      scopes: [{ name: '用户级', path: '~/.codex/config.toml', note: '' }],
    });
  });

  it('新开启的 MCP 输出默认为 JSON 风格，属性路径为 mcpServers', () => {
    expect(newMcpOutput()).toEqual({ style: 'json', property_path: 'mcpServers', scopes: [] });
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

  it('新增时可以只填基础信息，两种输出都先不开启', () => {
    const ws = apply(empty, (w) => addAgent(w, { name: 'Antigravity', description: '' }, context()));
    expect(ws.agents[1]).toMatchObject({ name: 'Antigravity', permission_output: null, mcp_output: null });
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

  it('可以只修改一种输出，其余字段保持不变', () => {
    const mcp_output: McpOutput = { style: 'toml', property_path: 'mcp_servers', scopes: [] };
    const ws = apply(
      empty,
      (w) => addAgent(w, agentInput({ description: '共享配置' }), context()),
      (w) => updateAgent(w, 'new-1', { mcp_output }, context())
    );
    expect(ws.agents[1]).toMatchObject({
      name: 'Antigravity',
      description: '共享配置',
      permission_output: grants,
      mcp_output,
    });
    expect(updateAgent(ws, 'new-1', { permission_output: { ...grants, property_path: '' } }, context())).toEqual({
      problem: 'propertyPathInvalid',
    });
  });

  it('编辑不存在的 Agent 时返回原因码', () => {
    expect(updateAgent(empty, 'missing', agentInput(), context())).toEqual({ problem: 'notFound' });
  });

  it('删除 Agent 时连同它的内置工具和指向这些内置工具的规则一起删除，共享规则保留', () => {
    const ws: Workspace = {
      ...withRead,
      command_tools: [{ id: 'git', key: 'git', description: '', tag_ids: [], high_risk: false, high_risk_reason: '' }],
      rules: [
        {
          id: 'r1',
          tool: { type: 'command', id: 'git' },
          pattern: '',
          decision: 'allow',
          high_risk: false,
          high_risk_reason: '',
        },
        {
          id: 'r2',
          tool: { type: 'built_in', id: 'read' },
          pattern: './src/',
          decision: 'allow',
          high_risk: false,
          high_risk_reason: '',
        },
        {
          id: 'r3',
          tool: { type: 'built_in', id: 'read' },
          pattern: '',
          decision: 'ask',
          high_risk: false,
          high_risk_reason: '',
        },
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

  it('当前选中的 Agent 存在时取它；未选择或已被删除时回到第一个 Agent；没有 Agent 时为空', () => {
    const ws = apply(empty, (w) => addAgent(w, agentInput({ name: 'Codex CLI' }), context()));
    expect(findSelectedAgent(ws, 'new-1')?.name).toBe('Codex CLI');
    expect(findSelectedAgent(ws, null)?.id).toBe('agent-claude');

    const deleted = apply(ws, (w) => deleteAgent(w, 'new-1', context()));
    expect(findSelectedAgent(deleted, 'new-1')?.id).toBe('agent-claude');

    const none = apply(deleted, (w) => deleteAgent(w, 'agent-claude', context()));
    expect(findSelectedAgent(none, 'agent-claude')).toBeUndefined();
  });
});

function builtInInput(changes: Partial<BuiltInToolInput> = {}): BuiltInToolInput {
  return {
    key: 'Edit',
    description: '',
    writes: true,
    templates: { with_pattern: 'Edit({pattern}**)', without_pattern: 'Edit' },
    ...changes,
  };
}

describe('工作区操作：内置工具', () => {
  it('新增内置工具时去掉各字段首尾的空白，加入所属 Agent，并更新修改时间', () => {
    const input = builtInInput({
      key: ' Edit ',
      description: ' 修改文件 ',
      templates: { with_pattern: ' Edit({pattern}**) ', without_pattern: ' Edit ' },
    });
    const ws = apply(withRead, (w) => addBuiltInTool(w, 'agent-claude', input, context()));
    expect(ws.agents[0]?.built_in_tools[1]).toEqual({
      id: 'new-1',
      key: 'Edit',
      description: '修改文件',
      tag_ids: [],
      high_risk: false,
      high_risk_reason: '',
      writes: true,
      templates: { with_pattern: 'Edit({pattern}**)', without_pattern: 'Edit' },
    });
    expect(ws.updated_at).toBe(NOW);
  });

  it('标识只需在所属 Agent 内唯一：同一 Agent 内重复或为空时返回原因码，其他 Agent 可以同名', () => {
    expect(addBuiltInTool(withRead, 'agent-claude', builtInInput({ key: 'Read' }), context())).toEqual({
      problem: 'keyDuplicate',
    });
    expect(addBuiltInTool(withRead, 'agent-claude', builtInInput({ key: ' ' }), context())).toEqual({
      problem: 'keyEmpty',
    });
    const ctx = context();
    const ws = apply(
      withRead,
      (w) => addAgent(w, agentInput(), ctx),
      (w) => addBuiltInTool(w, 'new-1', builtInInput({ key: 'Read' }), ctx)
    );
    expect(ws.agents.map((agent) => agent.built_in_tools.map((tool) => tool.key))).toEqual([['Read'], ['Read']]);
  });

  it('所属 Agent 不存在时返回原因码', () => {
    expect(addBuiltInTool(withRead, 'missing', builtInInput(), context())).toEqual({ problem: 'notFound' });
  });

  it('编辑时可以保留自己的标识，但不能改成同一 Agent 内别人的标识；修改模板后输出随之变化', () => {
    const ctx = context();
    const ws = apply(
      withRead,
      (w) => addBuiltInTool(w, 'agent-claude', builtInInput(), ctx),
      (w) => addRule(w, { tool: { type: 'built_in', id: 'read' }, pattern: './src/', decision: 'allow' }, ctx),
      (w) =>
        updateBuiltInTool(
          w,
          'read',
          builtInInput({ key: 'Read', templates: { with_pattern: 'Read({pattern}**)', without_pattern: 'Read' } }),
          ctx
        )
    );
    expect(ws.agents[0]?.built_in_tools.map(({ key, writes }) => ({ key, writes }))).toEqual([
      { key: 'Read', writes: true },
      { key: 'Edit', writes: true },
    ]);
    expect(allowEntries(ws)).toEqual(['Read(./src/**)']);
    expect(updateBuiltInTool(ws, 'read', builtInInput({ key: 'Edit' }), ctx)).toEqual({ problem: 'keyDuplicate' });
    expect(updateBuiltInTool(ws, 'missing', builtInInput(), ctx)).toEqual({ problem: 'notFound' });
  });

  it('删除内置工具时连同指向它的规则一起删除，删除前可以查询受影响的规则数量', () => {
    const ctx = context();
    const ws = apply(
      {
        ...withRead,
        command_tools: [
          { id: 'git', key: 'git', description: '', tag_ids: [], high_risk: false, high_risk_reason: '' },
        ],
      },
      (w) => addBuiltInTool(w, 'agent-claude', builtInInput(), ctx),
      (w) => addRule(w, { tool: { type: 'built_in', id: 'read' }, pattern: '', decision: 'allow' }, ctx),
      (w) => addRule(w, { tool: { type: 'built_in', id: 'read' }, pattern: './src/', decision: 'deny' }, ctx),
      (w) => addRule(w, { tool: { type: 'built_in', id: 'new-1' }, pattern: '', decision: 'ask' }, ctx),
      (w) => addRule(w, { tool: { type: 'command', id: 'git' }, pattern: '', decision: 'allow' }, ctx)
    );
    expect(countRulesForTool(ws, { type: 'built_in', id: 'read' })).toBe(2);

    const deleted = apply(ws, (w) => deleteBuiltInTool(w, 'read', ctx));
    expect(deleted.agents[0]?.built_in_tools.map((tool) => tool.key)).toEqual(['Edit']);
    expect(deleted.rules.map((rule) => rule.id)).toEqual(['new-4', 'new-5']);
    expect(allowEntries(deleted)).toEqual(['Bash(git *)']);
    expect(deleted.updated_at).toBe(NOW);
    expect(deleteBuiltInTool(deleted, 'read', ctx)).toEqual({ problem: 'notFound' });
  });
});

describe('工作区操作：标签', () => {
  it('新增标签时去掉首尾空白，并更新修改时间', () => {
    const ws = apply(empty, (w) => addTag(w, { key: ' vcs ', name: ' 版本控制 ' }, context()));
    expect(ws.tags).toEqual([{ id: 'new-1', key: 'vcs', name: '版本控制' }]);
    expect(ws.updated_at).toBe(NOW);
  });

  it('标识为空、标识重复或名称为空时返回原因码', () => {
    const ctx = context();
    const ws = apply(empty, (w) => addTag(w, { key: 'vcs', name: '版本控制' }, ctx));
    expect(addTag(ws, { key: ' ', name: '名称' }, ctx)).toEqual({ problem: 'keyEmpty' });
    expect(addTag(ws, { key: 'vcs', name: '另一个' }, ctx)).toEqual({ problem: 'keyDuplicate' });
    expect(addTag(ws, { key: 'net', name: ' ' }, ctx)).toEqual({ problem: 'nameEmpty' });
  });

  it('重命名标签时可以修改标识和名称，但不能改成别的标签的标识', () => {
    const ctx = context();
    const ws = apply(
      empty,
      (w) => addTag(w, { key: 'vcs', name: '版本控制' }, ctx),
      (w) => addTag(w, { key: 'net', name: '网络' }, ctx)
    );
    const renamed = apply(ws, (w) => updateTag(w, 'new-1', { key: 'scm', name: '源码管理' }, ctx));
    expect(renamed.tags[0]).toEqual({ id: 'new-1', key: 'scm', name: '源码管理' });
    expect(updateTag(ws, 'new-1', { key: 'net', name: '网络' }, ctx)).toEqual({ problem: 'keyDuplicate' });
    expect(updateTag(ws, 'missing', { key: 'x', name: 'x' }, ctx)).toEqual({ problem: 'notFound' });
  });

  it('删除标签', () => {
    const ctx = context();
    const ws = apply(
      empty,
      (w) => addTag(w, { key: 'vcs', name: '版本控制' }, ctx),
      (w) => addTag(w, { key: 'net', name: '网络' }, ctx)
    );
    const deleted = apply(ws, (w) => deleteTag(w, 'new-1', ctx));
    expect(deleted.tags.map((tag) => tag.key)).toEqual(['net']);
    expect(deleted.updated_at).toBe(NOW);
    expect(deleteTag(deleted, 'new-1', ctx)).toEqual({ problem: 'notFound' });
  });

  it('新增三类工具时可以同时打多个标签，重复的标签只保留一次', () => {
    const ctx = context();
    const ws = apply(
      withRead,
      (w) => addCommandTool(w, { key: 'git', description: '', tag_ids: ['vcs', 'net', 'vcs'] }, ctx),
      (w) => addMcpServer(w, { key: 'context7', content: '{}', description: '', tag_ids: ['search'] }, ctx),
      (w) => addBuiltInTool(w, 'agent-claude', builtInInput({ tag_ids: ['fs', 'search', 'fs'] }), ctx)
    );
    expect(ws.command_tools[0]?.tag_ids).toEqual(['vcs', 'net']);
    expect(ws.mcp_servers[0]?.tag_ids).toEqual(['search']);
    expect(ws.agents[0]?.built_in_tools[1]?.tag_ids).toEqual(['fs', 'search']);
    expect(ws.updated_at).toBe(NOW);
  });

  it('新增工具时省略标签，得到空的标签列表', () => {
    const ws = apply(withRead, (w) => addCommandTool(w, { key: 'git', description: '' }, context()));
    expect(ws.command_tools[0]?.tag_ids).toEqual([]);
  });

  it('编辑工具时可以整体替换标签；省略标签时保留原有的标签', () => {
    const ctx = context();
    const ws = apply(
      withRead,
      (w) => addCommandTool(w, { key: 'git', description: '', tag_ids: ['vcs'] }, ctx),
      (w) => addMcpServer(w, { key: 'context7', content: '{}', description: '', tag_ids: ['search'] }, ctx),
      (w) => updateBuiltInTool(w, 'read', builtInInput({ key: 'Read', tag_ids: ['fs'] }), ctx)
    );
    const replaced = apply(
      ws,
      (w) => updateCommandTool(w, 'new-1', { key: 'git', description: '', tag_ids: ['net', 'vcs', 'net'] }, ctx),
      (w) => updateMcpServer(w, 'new-2', { key: 'context7', content: '{}', description: '', tag_ids: [] }, ctx)
    );
    expect(replaced.command_tools[0]?.tag_ids).toEqual(['net', 'vcs']);
    expect(replaced.mcp_servers[0]?.tag_ids).toEqual([]);

    const kept = apply(
      ws,
      (w) => updateCommandTool(w, 'new-1', { key: 'git', description: '版本控制' }, ctx),
      (w) => updateBuiltInTool(w, 'read', builtInInput({ key: 'Read' }), ctx)
    );
    expect(kept.command_tools[0]?.tag_ids).toEqual(['vcs']);
    expect(kept.agents[0]?.built_in_tools[0]?.tag_ids).toEqual(['fs']);
  });

  it('按种类统计引用某个标签的工具，内置工具跨 Agent 合计', () => {
    const ctx = context();
    const ws = apply(
      withRead,
      (w) => addCommandTool(w, { key: 'git', description: '', tag_ids: ['vcs'] }, ctx),
      (w) => addCommandTool(w, { key: 'gh', description: '', tag_ids: ['vcs', 'net'] }, ctx),
      (w) => addCommandTool(w, { key: 'curl', description: '', tag_ids: ['net'] }, ctx),
      (w) => addMcpServer(w, { key: 'github', content: '{}', description: '', tag_ids: ['vcs'] }, ctx),
      (w) => updateBuiltInTool(w, 'read', builtInInput({ key: 'Read', tag_ids: ['vcs'] }), ctx),
      (w) => addAgent(w, agentInput(), ctx),
      (w) => addBuiltInTool(w, 'new-5', builtInInput({ tag_ids: ['vcs'] }), ctx)
    );
    expect(countToolsForTag(ws, 'vcs')).toEqual({ command: 2, mcp: 1, built_in: 2 });
    expect(countToolsForTag(ws, 'net')).toEqual({ command: 2, mcp: 0, built_in: 0 });
    expect(countToolsForTag(ws, 'none')).toEqual({ command: 0, mcp: 0, built_in: 0 });
  });

  it('合计引用某个标签的各类工具，供删除标签前提示', () => {
    expect(totalToolCount({ command: 2, mcp: 1, built_in: 2 })).toBe(5);
    expect(totalToolCount({ command: 0, mcp: 0, built_in: 0 })).toBe(0);
  });

  it('删除标签时不修改引用它的工具，残留的标签 ID 成为悬空引用', () => {
    const ctx = context();
    const ws = apply(
      withRead,
      (w) => addTag(w, { key: 'vcs', name: '版本控制' }, ctx),
      (w) => addTag(w, { key: 'fs', name: '文件系统' }, ctx),
      (w) => addCommandTool(w, { key: 'git', description: '', tag_ids: ['new-1', 'new-2'] }, ctx),
      (w) => updateBuiltInTool(w, 'read', builtInInput({ key: 'Read', tag_ids: ['new-2'] }), ctx)
    );
    expect(countToolsForTag(ws, 'new-2')).toEqual({ command: 1, mcp: 0, built_in: 1 });

    const deleted = apply(ws, (w) => deleteTag(w, 'new-2', ctx));
    expect(deleted.command_tools[0]?.tag_ids).toEqual(['new-1', 'new-2']);
    expect(deleted.agents[0]?.built_in_tools[0]?.tag_ids).toEqual(['new-2']);
    expect(resolveTags(deleted, ['new-1', 'new-2'])).toEqual([
      { id: 'new-1', tag: { id: 'new-1', key: 'vcs', name: '版本控制' } },
      { id: 'new-2', tag: null },
    ]);
    // 悬空引用不影响校验，可以照常保存和导入。
    expect(parseWorkspace(deleted)).toEqual({ workspace: deleted });
  });

  it('增删标签、给工具打标签都不改变任何 Agent 的生成结果', () => {
    const ctx = context();
    const preset = createPresetWorkspace();
    const outputs = (ws: Workspace) => ws.agents.map((agent) => generate(ws, agent.id, EMPTY_DEVICE_SETTINGS));

    const tagged = apply(
      preset,
      (w) => addTag(w, { key: 'mine', name: '我的' }, ctx),
      ...preset.command_tools.map(
        (tool) => (w: Workspace) => updateCommandTool(w, tool.id, { ...tool, tag_ids: ['new-1'] }, ctx)
      ),
      ...preset.mcp_servers.map(
        (server) => (w: Workspace) =>
          updateMcpServer(w, server.id, { ...server, content: JSON.stringify(server.content), tag_ids: ['new-1'] }, ctx)
      ),
      ...preset.agents.flatMap((agent) =>
        agent.built_in_tools.map(
          (tool) => (w: Workspace) => updateBuiltInTool(w, tool.id, { ...tool, tag_ids: ['new-1'] }, ctx)
        )
      ),
      (w) => updateTag(w, 'new-1', { key: 'renamed', name: '改名' }, ctx),
      ...preset.tags.map((tag) => (w: Workspace) => deleteTag(w, tag.id, ctx))
    );
    expect(outputs(tagged)).toEqual(outputs(preset));
    expect(outputs(apply(tagged, (w) => deleteTag(w, 'new-1', ctx)))).toEqual(outputs(preset));
  });
});

describe('查询：筛选', () => {
  const ctx = context();
  /* new-1 vcs、new-2 net；git(new-3) 打 vcs，curl(new-4) 打 net，context7(new-5) 打 net，Read 打 vcs。 */
  const ws = apply(
    withRead,
    (w) => addTag(w, { key: 'vcs', name: '版本控制' }, ctx),
    (w) => addTag(w, { key: 'net', name: '网络' }, ctx),
    (w) => addCommandTool(w, { key: 'git', description: '分布式版本控制', tag_ids: ['new-1'] }, ctx),
    (w) => addCommandTool(w, { key: 'curl', description: '传输数据', tag_ids: ['new-2'] }, ctx),
    (w) => addMcpServer(w, { key: 'context7', content: '{}', description: '', tag_ids: ['new-2'] }, ctx),
    (w) => updateBuiltInTool(w, 'read', builtInInput({ key: 'Read', tag_ids: ['new-1'] }), ctx),
    (w) => addRule(w, { tool: { type: 'command', id: 'new-3' }, pattern: 'status', decision: 'allow' }, ctx),
    (w) => addRule(w, { tool: { type: 'command', id: 'new-3' }, pattern: 'push', decision: 'ask' }, ctx),
    (w) => addRule(w, { tool: { type: 'command', id: 'new-4' }, pattern: '', decision: 'deny' }, ctx),
    (w) => addRule(w, { tool: { type: 'mcp', id: 'new-5' }, pattern: '', decision: 'allow' }, ctx),
    (w) => addRule(w, { tool: { type: 'built_in', id: 'read' }, pattern: './', decision: 'allow' }, ctx)
  );

  function tools(filter: ToolFilter): string[] {
    return ws.command_tools.filter((tool) => matchesToolFilter(tool, filter)).map((tool) => tool.key);
  }

  function rules(filter: Partial<RuleFilter>): string[] {
    return listRules(ws)
      .filter((item) => matchesRuleFilter(item, { ...NO_RULE_FILTER, ...filter }))
      .map(({ rule, tool }) => `${tool.tool.key} ${rule.pattern}`.trim());
  }

  it('工具按名称筛选时不区分大小写，标识或描述包含关键字即符合', () => {
    expect(tools({ name: '', tagId: null })).toEqual(['git', 'curl']);
    expect(tools({ name: ' GI ', tagId: null })).toEqual(['git']);
    expect(tools({ name: '传输', tagId: null })).toEqual(['curl']);
  });

  it('规则按所指工具筛选，同名的命令工具与 MCP 工具不混淆', () => {
    expect(rules({ tool: { type: 'command', id: 'new-3' } })).toEqual(['git push', 'git status']);
    expect(rules({ tool: { type: 'mcp', id: 'new-5' } })).toEqual(['context7']);
    expect(rules({ tool: { type: 'command', id: 'new-5' } })).toEqual([]);
  });

  it('规则按归属筛选：内置工具的规则属于所在的 Agent，其余规则共享', () => {
    expect(rules({ owner: 'agent:agent-claude' })).toEqual(['Read ./']);
    expect(rules({ owner: 'shared' })).toEqual(['curl', 'git push', 'git status', 'context7']);
    expect(rules({ owner: 'agent:other' })).toEqual([]);
  });

  it('工具按标签筛选，与名称同时生效', () => {
    expect(tools({ name: '', tagId: 'new-2' })).toEqual(['curl']);
    expect(tools({ name: 'git', tagId: 'new-2' })).toEqual([]);
    expect(tools({ name: 'git', tagId: 'new-1' })).toEqual(['git']);
  });

  it('规则按所指工具分组，组的顺序与组内规则的顺序沿用列表', () => {
    const groups = groupRulesByTool(listRules(ws)).map(({ tool, rules: items }) => [
      tool.tool.key,
      items.map((rule) => rule.pattern),
    ]);
    expect(groups).toEqual([
      ['curl', ['']],
      ['git', ['push', 'status']],
      ['context7', ['']],
      ['Read', ['./']],
    ]);
  });

  it('同名的命令工具与 MCP 工具分在不同的组', () => {
    const local = context();
    const same = apply(
      empty,
      (w) => addCommandTool(w, { key: 'github', description: '' }, local),
      (w) => addMcpServer(w, { key: 'github', content: '{}', description: '' }, local),
      (w) => addRule(w, { tool: { type: 'command', id: 'new-1' }, pattern: 'pr', decision: 'allow' }, local),
      (w) => addRule(w, { tool: { type: 'mcp', id: 'new-2' }, pattern: '', decision: 'ask' }, local)
    );
    expect(groupRulesByTool(listRules(same)).map(({ tool, rules: items }) => [tool.type, items.length])).toEqual([
      ['command', 1],
      ['mcp', 1],
    ]);
  });

  it('不同 Agent 的同名内置工具按 Agent 的顺序各成一组，组内规则不交错', () => {
    // 在 Claude Code 之后加一个 Agent，带同名的 Read。
    const agents = withRead.agents.flatMap((agent) => [
      agent,
      {
        ...agent,
        id: 'agent-other',
        name: 'Other',
        built_in_tools: agent.built_in_tools.map((tool) => ({ ...tool, id: 'read-other' })),
      },
    ]);
    const local = context();
    const two = apply(
      { ...withRead, agents },
      (w) => addRule(w, { tool: { type: 'built_in', id: 'read-other' }, pattern: 'a/', decision: 'allow' }, local),
      (w) => addRule(w, { tool: { type: 'built_in', id: 'read' }, pattern: 'b/', decision: 'allow' }, local),
      (w) => addRule(w, { tool: { type: 'built_in', id: 'read-other' }, pattern: 'c/', decision: 'allow' }, local)
    );
    expect(listRules(two).map(({ rule }) => rule.pattern)).toEqual(['b/', 'a/', 'c/']);
    expect(groupRulesByTool(listRules(two)).map(({ tool, rules: items }) => [tool.tool.id, items.length])).toEqual([
      ['read', 1],
      ['read-other', 2],
    ]);
  });

  it('规则按工具的标签、决策、工具类型筛选，多个条件同时生效', () => {
    expect(rules({})).toEqual(['curl', 'git push', 'git status', 'context7', 'Read ./']);
    expect(rules({ tagId: 'new-1' })).toEqual(['git push', 'git status', 'Read ./']);
    expect(rules({ decision: 'allow' })).toEqual(['git status', 'context7', 'Read ./']);
    expect(rules({ toolType: 'mcp' })).toEqual(['context7']);
    expect(rules({ tagId: 'new-2', decision: 'allow' })).toEqual(['context7']);
    expect(rules({ tagId: 'new-1', decision: 'allow', toolType: 'command' })).toEqual(['git status']);
  });
});
