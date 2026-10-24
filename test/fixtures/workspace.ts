import type { Workspace } from '@/lib/workspace';

/* 测试共用的工作区样本。 */

/** 每类条目都至少有一个、可选部分都有值的工作区。 */
export function edited(): Workspace {
  return {
    schema_version: 1,
    updated_at: '2026-10-23T12:00:00.000Z',
    tags: [{ id: 'tag-1', key: 'vcs', name: '版本控制' }],
    command_tools: [
      {
        id: 'tool-1',
        key: 'make',
        description: '构建',
        tag_ids: ['tag-1', 'tag-gone'],
        high_risk: true,
        high_risk_reason: '',
      },
    ],
    mcp_servers: [
      {
        id: 'mcp-1',
        key: 'github',
        content: { command: 'npx', args: ['-y', 'server'], env: { TOKEN: '${TOKEN}' }, timeout: 30, debug: null },
        description: '',
        tag_ids: [],
        high_risk: false,
        high_risk_reason: '',
      },
    ],
    agents: [
      {
        id: 'agent-1',
        name: 'Claude Code',
        description: '',
        built_in_tools: [
          {
            id: 'builtin-1',
            key: 'Read',
            description: '',
            tag_ids: [],
            high_risk: false,
            high_risk_reason: '',
            writes: false,
            templates: { with_pattern: 'Read({pattern})', without_pattern: 'Read' },
          },
        ],
        permission_output: {
          property_path: 'permissions',
          scopes: [{ name: '用户级', path: '~/.claude/settings.json', note: '' }],
          decision_keys: { allow: 'allow', ask: 'ask', deny: '' },
          command_templates: { with_pattern: 'Bash({command} {pattern} *)', without_pattern: 'Bash({command} *)' },
          mcp_templates: { with_pattern: 'mcp__{server}__{pattern}', without_pattern: 'mcp__{server}' },
        },
        mcp_output: { style: 'json', property_path: 'mcpServers', scopes: [] },
      },
    ],
    rules: [
      {
        id: 'rule-1',
        tool: { type: 'command', id: 'tool-1' },
        pattern: '',
        decision: 'allow',
        high_risk: false,
        high_risk_reason: '',
      },
      {
        id: 'rule-2',
        tool: { type: 'built_in', id: 'builtin-1' },
        pattern: './src/**',
        decision: 'deny',
        high_risk: true,
        high_risk_reason: '',
      },
    ],
  };
}

/** 读取某个位置的值。 */
export function getIn(root: unknown, path: (string | number)[]): unknown {
  return path.reduce<unknown>((node, step) => (node as Record<string, unknown>)[step], root);
}

/** 把合法工作区某个位置的值改掉（`undefined` 表示删除该属性），返回 JSON 文本。 */
export function corrupt(path: (string | number)[], value: unknown): string {
  const root: unknown = structuredClone(edited());
  const parent = getIn(root, path.slice(0, -1));
  const last = path[path.length - 1]!;
  if (value === undefined) {
    delete (parent as Record<string, unknown>)[last];
  } else {
    (parent as Record<string, unknown>)[last] = value;
  }
  return JSON.stringify(root);
}
