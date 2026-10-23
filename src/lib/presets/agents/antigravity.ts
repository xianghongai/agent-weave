import type { Agent } from '@/lib/workspace';

/**
 * Antigravity：权限写在共享配置的 `userSettings.globalPermissionGrants` 下，IDE、App、CLI 共用。
 * 命令工具写成 `command(git push)`，MCP 工具写成 `mcp(server/tool)`。
 */
export const ANTIGRAVITY: Agent = {
  id: 'preset-agent-antigravity',
  name: 'Antigravity',
  description: 'Google 的 AI Coding Agent，IDE、App 和 CLI 共用一份权限配置。',
  built_in_tools: [],
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
