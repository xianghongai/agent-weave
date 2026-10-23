import type { Agent, BuiltInTool } from '@/lib/workspace';

function builtIn(key: string, description: string, writes: boolean, with_pattern: string): BuiltInTool {
  return {
    id: `preset-built-in-claude-code-${key.toLowerCase()}`,
    key,
    description,
    tag_ids: [],
    high_risk: false,
    writes,
    templates: { with_pattern, without_pattern: key },
  };
}

/**
 * Claude Code 的内置工具。
 * 路径模式是以 `/` 结尾的目录前缀，模板补上 `**` 得到 gitignore 风格的 glob，如 `Read(./src/**)`。
 * `Edit` 的规则对所有改写文件的内置工具生效（包括 `Write`），因此不单列 `Write`。
 */
const BUILT_IN_TOOLS: BuiltInTool[] = [
  builtIn('Read', '读取文件。模式填目录前缀，如 ./src/', false, 'Read({pattern}**)'),
  builtIn('Edit', '修改或新建文件。模式填目录前缀，如 ./src/', true, 'Edit({pattern}**)'),
  builtIn('WebFetch', '抓取网页。模式填域名，如 example.com', false, 'WebFetch(domain:{pattern})'),
  // WebSearch 不接受模式，有模式的规则会进入跳过的规则。
  builtIn('WebSearch', '搜索网页', false, ''),
];

/** Claude Code：权限写在 `permissions` 下，命令工具通过 `Bash(...)` 表达。 */
export const CLAUDE_CODE: Agent = {
  id: 'preset-agent-claude-code',
  name: 'Claude Code',
  description: 'Anthropic 的命令行 AI Coding Agent。',
  built_in_tools: BUILT_IN_TOOLS,
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
  mcp_output: null,
};
