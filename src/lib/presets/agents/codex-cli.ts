import type { Agent } from '@/lib/workspace';

/** MCP 内容按原样转换为 TOML，不替用户改写，因此在作用域说明中提示与其他 Agent 的差异。 */
const ENV_VARS_NOTE =
  'Codex 不展开 ${VAR}，也不把本机环境变量全部传给 Server：引用环境变量的字段需要改用 env_vars = ["NAME"]。';

/**
 * Codex CLI：一期只输出 MCP 配置。
 * 它的命令规则是 Starlark 的 `prefix_rule`，路径与网址规则在另一套实验性配置中，模板表达不了，因此不输出权限（见 ADR 0001）。
 * MCP 配置是 TOML 的 `[mcp_servers.<标识>]` 表，由各 Server 的 JSON 内容转换而来。
 */
export const CODEX_CLI: Agent = {
  id: 'preset-agent-codex-cli',
  name: 'Codex CLI',
  description: 'OpenAI 的命令行 AI Coding Agent。',
  built_in_tools: [],
  permission_output: null,
  mcp_output: {
    style: 'toml',
    property_path: 'mcp_servers',
    scopes: [
      { name: '用户级', path: '~/.codex/config.toml', note: `对当前用户的所有项目生效。${ENV_VARS_NOTE}` },
      { name: '项目级', path: '.codex/config.toml', note: `只在受信任的项目中生效。${ENV_VARS_NOTE}` },
    ],
  },
};
