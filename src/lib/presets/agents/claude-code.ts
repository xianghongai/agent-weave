import type { Agent } from '@/lib/workspace';

/** Claude Code：权限写在 `permissions` 下，命令工具通过 `Bash(...)` 表达。 */
export const CLAUDE_CODE: Agent = {
  id: 'preset-agent-claude-code',
  name: 'Claude Code',
  description: 'Anthropic 的命令行 AI Coding Agent。',
  built_in_tools: [],
  permission_output: {
    property_path: 'permissions',
    scopes: [
      { name: '用户级', path: '~/.claude/settings.json', note: '对当前用户的所有项目生效。' },
      { name: '项目级', path: '.claude/settings.json', note: '提交到仓库，与团队共享。' },
      { name: '本地级', path: '.claude/settings.local.json', note: '只对自己生效，不提交到仓库。' },
    ],
    decision_keys: { allow: 'allow', ask: 'ask', deny: 'deny' },
    command_templates: { with_pattern: 'Bash({command} {pattern} *)', without_pattern: 'Bash({command} *)' },
    mcp_templates: { with_pattern: 'mcp__{server}__{pattern}', without_pattern: 'mcp__{server}' },
  },
  mcp_output: {
    style: 'json',
    property_path: 'mcpServers',
    scopes: [
      { name: '项目级', path: '.mcp.json', note: '提交到仓库，与团队共享。' },
      { name: '用户级', path: '~/.claude.json', note: '对当前用户的所有项目生效。' },
    ],
  },
};
