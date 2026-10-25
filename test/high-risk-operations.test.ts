import { describe, expect, it } from 'vitest';

import { highRiskReasons } from '@/lib/rule-notices';
import type { Workspace } from '@/lib/workspace';
import {
  type OperationContext,
  type OperationResult,
  addBuiltInTool,
  addCommandTool,
  addMcpServer,
  addRule,
  updateBuiltInTool,
  updateCommandTool,
  updateMcpServer,
  listRules,
  updateRule,
} from '@/lib/workspace-operations';

/* 工作区操作：命令工具、MCP Server、内置工具和规则的高危标记。 */

function context(): OperationContext {
  let seq = 0;
  return {
    now: () => '2026-10-24T12:00:00.000Z',
    newId: () => {
      seq += 1;
      return `new-${seq}`;
    },
  };
}

const empty: Workspace = {
  schema_version: 1,
  updated_at: '2026-01-01T00:00:00.000Z',
  tags: [],
  command_tools: [],
  mcp_servers: [],
  agents: [
    {
      id: 'agent-claude',
      name: 'Claude Code',
      description: '',
      built_in_tools: [],
      permission_output: null,
      mcp_output: null,
    },
  ],
  rules: [],
};

function workspaceOf(result: OperationResult): Workspace {
  if ('problem' in result) {
    throw new Error(`操作失败：${result.problem}`);
  }
  return result.workspace;
}

describe('工作区操作：高危标记', () => {
  it('命令工具新增时可标记高危，编辑时可修改，省略时保持不变', () => {
    const ctx = context();
    const added = workspaceOf(addCommandTool(empty, { key: 'rm', description: '', high_risk: true }, ctx));
    expect(added.command_tools[0]?.high_risk).toBe(true);

    const kept = workspaceOf(updateCommandTool(added, 'new-1', { key: 'rm', description: '删除' }, ctx));
    expect(kept.command_tools[0]?.high_risk).toBe(true);

    const cleared = workspaceOf(
      updateCommandTool(kept, 'new-1', { key: 'rm', description: '', high_risk: false }, ctx)
    );
    expect(cleared.command_tools[0]?.high_risk).toBe(false);

    const plain = workspaceOf(addCommandTool(empty, { key: 'ls', description: '' }, context()));
    expect(plain.command_tools[0]?.high_risk).toBe(false);
  });

  it('MCP Server 新增时可标记高危，编辑时可修改，省略时保持不变', () => {
    const ctx = context();
    const input = { key: 'shell', content: '{}', description: '' };
    const added = workspaceOf(addMcpServer(empty, { ...input, high_risk: true }, ctx));
    expect(added.mcp_servers[0]?.high_risk).toBe(true);

    const kept = workspaceOf(updateMcpServer(added, 'new-1', input, ctx));
    expect(kept.mcp_servers[0]?.high_risk).toBe(true);

    const cleared = workspaceOf(updateMcpServer(kept, 'new-1', { ...input, high_risk: false }, ctx));
    expect(cleared.mcp_servers[0]?.high_risk).toBe(false);
  });

  it('内置工具新增时可标记高危，编辑时可修改，省略时保持不变', () => {
    const ctx = context();
    const input = {
      key: 'Bash',
      description: '',
      writes: false,
      templates: { with_pattern: 'Bash({pattern})', without_pattern: 'Bash' },
    };
    const added = workspaceOf(addBuiltInTool(empty, 'agent-claude', { ...input, high_risk: true }, ctx));
    const toolOf = (ws: Workspace) => ws.agents[0]?.built_in_tools[0];
    expect(toolOf(added)?.high_risk).toBe(true);

    const kept = workspaceOf(updateBuiltInTool(added, 'new-1', input, ctx));
    expect(toolOf(kept)?.high_risk).toBe(true);

    const cleared = workspaceOf(updateBuiltInTool(kept, 'new-1', { ...input, high_risk: false }, ctx));
    expect(toolOf(cleared)?.high_risk).toBe(false);
  });

  it('规则新增时可标记高危，编辑时可修改，省略时保持不变', () => {
    const ctx = context();
    const withGit = workspaceOf(addCommandTool(empty, { key: 'git', description: '' }, ctx));
    const input = { tool: { type: 'command', id: 'new-1' }, pattern: 'push --force', decision: 'allow' } as const;
    const added = workspaceOf(addRule(withGit, { ...input, high_risk: true }, ctx));
    expect(added.rules[0]?.high_risk).toBe(true);

    const kept = workspaceOf(updateRule(added, 'new-2', input, ctx));
    expect(kept.rules[0]?.high_risk).toBe(true);

    const cleared = workspaceOf(updateRule(kept, 'new-2', { ...input, high_risk: false }, ctx));
    expect(cleared.rules[0]?.high_risk).toBe(false);
  });

  it('高危说明去掉首尾空白，省略时保持不变，取消高危时一并清空', () => {
    const ctx = context();
    const added = workspaceOf(
      addCommandTool(empty, { key: 'rm', description: '', high_risk: true, high_risk_reason: '  删除后无法恢复 ' }, ctx)
    );
    expect(added.command_tools[0]?.high_risk_reason).toBe('删除后无法恢复');

    const kept = workspaceOf(updateCommandTool(added, 'new-1', { key: 'rm', description: '' }, ctx));
    expect(kept.command_tools[0]?.high_risk_reason).toBe('删除后无法恢复');

    const cleared = workspaceOf(
      updateCommandTool(kept, 'new-1', { key: 'rm', description: '', high_risk: false, high_risk_reason: '留着' }, ctx)
    );
    expect(cleared.command_tools[0]?.high_risk_reason).toBe('');

    const plain = workspaceOf(
      addCommandTool(empty, { key: 'ls', description: '', high_risk_reason: '无效' }, context())
    );
    expect(plain.command_tools[0]?.high_risk_reason).toBe('');
  });

  it('MCP Server、内置工具和规则同样保存高危说明', () => {
    const ctx = context();
    const reason = { high_risk: true, high_risk_reason: '能执行任意命令' };
    const withServer = workspaceOf(
      addMcpServer(empty, { key: 'shell', content: '{}', description: '', ...reason }, ctx)
    );
    expect(withServer.mcp_servers[0]?.high_risk_reason).toBe('能执行任意命令');

    const templates = { with_pattern: 'Bash({pattern})', without_pattern: 'Bash' };
    const withBash = workspaceOf(
      addBuiltInTool(empty, 'agent-claude', { key: 'Bash', description: '', writes: false, templates, ...reason }, ctx)
    );
    expect(withBash.agents[0]?.built_in_tools[0]?.high_risk_reason).toBe('能执行任意命令');

    const withGit = workspaceOf(addCommandTool(empty, { key: 'git', description: '' }, context()));
    const input = { tool: { type: 'command', id: 'new-1' }, pattern: 'push --force', decision: 'allow' } as const;
    const withRule = workspaceOf(
      addRule(withGit, { ...input, high_risk: true, high_risk_reason: '覆盖远程' }, context())
    );
    expect(withRule.rules[0]?.high_risk_reason).toBe('覆盖远程');
  });

  it('规则的高危说明先列规则自己的，再列所指工具的，没有填写的不列', () => {
    const ctx = context();
    const ws = [
      (w: Workspace) =>
        addCommandTool(w, { key: 'git', description: '', high_risk: true, high_risk_reason: '能改写历史' }, ctx),
      (w: Workspace) => addCommandTool(w, { key: 'rm', description: '', high_risk: true }, ctx),
      (w: Workspace) =>
        addRule(
          w,
          {
            tool: { type: 'command', id: 'new-1' },
            pattern: 'push --force',
            decision: 'allow',
            high_risk: true,
            high_risk_reason: '覆盖远程',
          },
          ctx
        ),
      (w: Workspace) =>
        addRule(w, { tool: { type: 'command', id: 'new-1' }, pattern: 'status', decision: 'allow' }, ctx),
      (w: Workspace) => addRule(w, { tool: { type: 'command', id: 'new-2' }, pattern: '', decision: 'allow' }, ctx),
    ].reduce((current, step) => workspaceOf(step(current)), empty);

    const reasons = Object.fromEntries(
      listRules(ws).map((item) => [`${item.tool.tool.key} ${item.rule.pattern}`.trim(), highRiskReasons(item)])
    );
    expect(reasons).toEqual({ 'git push --force': ['覆盖远程', '能改写历史'], 'git status': ['能改写历史'], rm: [] });
  });
});
