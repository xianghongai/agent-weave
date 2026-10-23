import { describe, expect, it } from 'vitest';

import { generate } from '@/lib/generate';
import { EMPTY_DEVICE_SETTINGS, type Workspace } from '@/lib/workspace';
import {
  type OperationContext,
  addCommandTool,
  addRule,
  countRulesForTool,
  deleteCommandTool,
  deleteRule,
  listRules,
  updateCommandTool,
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
