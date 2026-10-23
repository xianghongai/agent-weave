import type { Agent, BuiltInTool } from '@/lib/workspace';

function builtIn(key: string, description: string, writes: boolean): BuiltInTool {
  return {
    id: `preset-built-in-antigravity-${key.replaceAll('_', '-')}`,
    key,
    description,
    tag_ids: [],
    high_risk: false,
    writes,
    templates: { with_pattern: `${key}({pattern})`, without_pattern: `${key}(*)` },
  };
}

/**
 * Antigravity 的内置工具。
 * 文件路径按目录递归匹配，模式直接填以 `/` 结尾的目录前缀，如 `write_file(src/)`，模板不再补 glob。
 */
const BUILT_IN_TOOLS: BuiltInTool[] = [
  builtIn('read_file', '读取文件。模式填目录前缀，如 src/', false),
  builtIn('write_file', '写入文件。模式填目录前缀，如 src/', true),
  builtIn('read_url', '读取网页。模式填域名，如 example.com', false),
  builtIn('execute_url', '在网页上执行操作。模式填域名，如 example.com', false),
];

/**
 * Antigravity：权限写在共享配置的 `userSettings.globalPermissionGrants` 下，IDE、App、CLI 共用。
 * 命令工具写成 `command(git push)`，MCP 工具写成 `mcp(server/tool)`。
 */
export const ANTIGRAVITY: Agent = {
  id: 'preset-agent-antigravity',
  name: 'Antigravity',
  description: 'Google 的 AI Coding Agent，IDE、App 和 CLI 共用一份权限配置。',
  built_in_tools: BUILT_IN_TOOLS,
  permission_output: {
    property_path: 'userSettings.globalPermissionGrants',
    scopes: [
      { name: '共享配置', path: '~/.gemini/config/config.json', note: 'IDE、App、CLI 共用。' },
      {
        name: 'CLI 设置',
        path: '~/.gemini/antigravity-cli/settings.json',
        note: '官方文档公开的 CLI 设置文件，属性名为 permissions，粘贴后需要把 globalPermissionGrants 改为 permissions。',
      },
    ],
    decision_keys: { allow: 'allow', ask: 'ask', deny: 'deny' },
    command_templates: { with_pattern: 'command({command} {pattern})', without_pattern: 'command({command})' },
    mcp_templates: { with_pattern: 'mcp({server}/{pattern})', without_pattern: 'mcp({server}/*)' },
  },
  mcp_output: {
    style: 'json',
    property_path: 'mcpServers',
    scopes: [
      {
        name: '用户级',
        path: '~/.gemini/config/mcp_config.json',
        note: 'IDE、App、CLI 共用。远程 MCP 在这里使用 serverUrl 而非 url，本工具不转换，粘贴后需要自行修改。',
      },
      { name: '工作区级', path: '.agents/mcp_config.json', note: '只对当前工作区生效。' },
    ],
  },
};
