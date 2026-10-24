# 各 Agent 的权限与 MCP 格式

预设的 Agent 定义和输出模板依据这里的事实编写。调研时间为 2026-10-23，来源以官方文档为准；具体取值以 `src/lib/presets/agents/` 中的定义为准，本文只记录代码里看不出来的格式规则和坑。

## Claude Code

- 权限位于 `settings.json` 的 `permissions.allow`、`ask`、`deny`，判定顺序为 deny、ask、allow，与规则写得多具体无关。
- 命令规则写作 `Bash(git push *)`。旧写法 `Bash(git push:*)` 等价，但 `:*` 只在结尾生效；结尾的 ` *` 也匹配不带参数的命令。
- 路径规则（`Read`、`Edit`）采用 gitignore 风格：`~/x` 表示主目录，`./x` 或不带前缀表示当前目录，**单个前导 `/` 表示相对设置文件所在目录**，绝对路径要写 `//abs`。因此 Claude Code 的路径规则一律写 `~/` 形式；`{{home}}` 展开后是单个 `/` 开头的绝对路径，含义会出错。
- `Write`、`NotebookEdit`、`Glob` 上的路径规则不会匹配，写入类权限用 `Edit`。
- MCP 规则写作 `mcp__<server>`、`mcp__<server>__*`、`mcp__<server>__<tool>`。`mcp__*` 不能用于 `allow`，所以中立模型没有“全部 MCP”的概念，逐个 Server 输出。
- MCP 配置是 JSON，根键 `mcpServers`，项目级在 `.mcp.json`，用户级在 `~/.claude.json` 顶层。远程 Server 必须写 `type`（`http` 或 `sse`），只有 `url` 会报错。支持 `${VAR}` 与 `${VAR:-default}`。

## Antigravity

- 权限有两个文件，层级不同：
  - `~/.gemini/config/config.json` 的 `userSettings.globalPermissionGrants`：共享配置中的全局授权，IDE、App、CLI 共用。这是预设的主属性路径，来自用户本机的实际配置，官方文档没有公开。
  - `~/.gemini/antigravity-cli/settings.json` 的 `permissions`：官方公开的 CLI 设置。预设把它列为第二个作用域，并提示粘贴后改键名。
- 两处都有 `allow`、`ask`、`deny`，判定顺序为 deny、ask、allow。每条规则必须匹配 `command(…)`、`read_file(…)`、`write_file(…)`、`read_url(…)`、`execute_url(…)`、`mcp(…)` 之一，CLI 会忽略无法解析的规则。
- `command(git push)` 按命令前缀匹配；`read_file`、`write_file` 按目录递归；`read_url`、`execute_url` 包含子域名；MCP 写作 `mcp(<server>/<tool>)` 或 `mcp(<server>/*)`。
- MCP 配置是 JSON，根键 `mcpServers`，全局在 `~/.gemini/config/mcp_config.json`，工作区在 `.agents/mcp_config.json`。远程 Server 用 `serverUrl`（`url` 也被接受），只支持 Streamable HTTP。本工具不做 `url` 与 `serverUrl` 的转换。

## Codex CLI

- 一期不输出权限，原因见 `docs/adr/0001-agent-definition-as-data.md`：命令规则是 Starlark 文件中的 `prefix_rule`（官方标注为实验性），路径与网址规则在另一套 beta 配置中。
- MCP 配置是 TOML 的 `[mcp_servers.<name>]` 表，位于 `~/.codex/config.toml` 和受信任项目的 `.codex/config.toml`。
- **Codex 不展开 `${VAR}`**，也不会把本机环境变量全部传给 Server；需要环境变量的字段要改用 `env_vars = ["NAME"]`。预设按约定不改写内容，只在作用域说明中提示。
- 预设 MCP 内容中的 `type = "stdio"` 不是 Codex 的字段，预计会被忽略，但没有在真实的 Codex 上验证过。

## 其他 Agent 的 MCP 风格

需要新增 Agent 定义时参考：

- 根键为 `mcpServers` 的 JSON，即 Claude 风格：Cursor、Kiro、Cline、Qwen Code、Antigravity。Windsurf 远程用 `serverUrl`，Qwen Code 的 `url` 表示 SSE、`httpUrl` 表示 Streamable HTTP。
- 根键不同的 JSON：VS Code 是 `servers`，Zed 是 `context_servers`，Amp 是扁平键 `amp.mcpServers`，可以通过属性路径适配。OpenCode 是 `mcp`，条目结构也不同（`command` 是单个数组，环境变量键为 `environment`），模板表达不了。
- TOML：只有 Codex。
