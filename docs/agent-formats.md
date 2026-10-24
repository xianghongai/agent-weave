# 各 Agent 的权限与 MCP 格式

预设的 Agent 定义和输出模板依据这里的事实编写。调研时间为 2026-10-23，来源以官方文档为准；具体取值以 `presets/agents/` 下各 Agent 的 JSONC 文件为准（写法见 `presets/README.md`），本文只记录数据文件里看不出来的格式规则和坑。

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

## Cursor CLI

- 只覆盖 CLI：权限位于 `~/.cursor/cli-config.json`（全局）和 `.cursor/cli.json`（项目）的 `permissions.allow`、`deny`，拒绝优先。项目文件只接受 `permissions`，其他键被忽略。IDE 的 `permissions.json`（`terminalAllowlist`、`mcpAllowlist`）是另一套键，两边不互通。
- **没有询问这一档**，`ask` 的决策键留空，询问规则（如 `rm` 整体询问）列为跳过的规则。未命中允许列表的命令在交互式会话中询问，无头模式下静默拒绝。
- 权限写法只有五类：`Shell(commandBase)`、`Read(pathOrGlob)`、`Write(pathOrGlob)`、`WebFetch(domainOrPattern)`、`Mcp(server:tool)`。`Grep`、`Task`、`WebSearch` 没有独立写法；没有独立的 `Edit`，编辑走 `Write`。
- `Shell(git)` 只匹配命令的第一个词，允许所有子命令，也不匹配 `/bin/rm` 或 `sh -c 'rm …'`。官方另有 `command:args` 写法，但只给出 `Shell(curl:*)` 一个例子，参数 glob 能否表达 `git push --force` 这样的子命令前缀没有说明。拒绝规则写错会静默放行，所以带模式的命令模板留空，这类规则列为跳过的规则。代价是整体允许 `git` 后，`git push --force` 等拒绝规则在 Cursor 中不生效。
- 路径 glob 支持 `**`、`*`、`?`。相对路径只限当前工作区，绝对路径可以访问工作区之外，因此 `{{home}}` 展开后的绝对路径可以直接用；不带模式的 `Read(**)`、`Write(**)` 也只覆盖当前工作区。
- MCP 规则写作 `Mcp(<server>:*)` 或 `Mcp(<server>:<tool>)`，Server 名来自 `mcp.json`。
- MCP 配置是 Claude 风格 JSON，根键 `mcpServers`，全局在 `~/.cursor/mcp.json`，项目在 `.cursor/mcp.json`，两者合并、同名以项目为准，CLI 与 IDE 共用。STDIO 的 `type: "stdio"` 是官方写法；远程 Server 只写 `url`。**环境变量写作 `${env:NAME}`**，官方没有说明 `${VAR}` 是否可用，本工具不转换，在作用域说明中提示。

## Gemini CLI

- 不输出权限，原因见 `docs/adr/0001-agent-definition-as-data.md`：
  - 设置文件的 `tools.allowed`、`tools.confirmationRequired` 仍可用，但 `tools.exclude` 已弃用，顶层的 `coreTools`、`excludeTools`、`autoAccept` 已移除。
  - `toolName(args)` 的括号参数只对 `run_shell_command` 有效，其他工具的参数被忽略、等同于整体放行，路径与域名规则会被悄悄放宽。
  - MCP 的放行在另一个路径：`mcp.allowed`、`mcp.excluded` 控制整个 Server，`mcpServers.<name>.trust` 让 Server 的所有工具免确认。
  - 官方主推的策略引擎是 `~/.gemini/policies/*.toml` 中的 `[[rule]]` 数组，每条规则要写 `toolName`、`decision`、`priority` 等多个字段，`priority` 缺失会让整个文件被跳过，模板表达不了。工作区策略目录官方标注为当前禁用。
- 因为不输出权限，预设不收录它的内置工具。
- MCP 配置写在设置文件的 `mcpServers` 下，用户级 `~/.gemini/settings.json`，项目级 `.gemini/settings.json`（只在受信任的工作区中加载）。设置文件还有其他键，粘贴的是 `mcpServers` 这一个键值对。
- 传输方式由字段决定：`command` 是 STDIO，`url` 是 SSE，`httpUrl` 是 Streamable HTTP。官方没有记载 `type` 字段，预设内容中的 `type: "stdio"` 预计被忽略，没有在真实的 Gemini CLI 上验证过。
- `env` 中支持 `$VAR` 和 `${VAR}`，未定义时展开为空字符串；密钥类的本机环境变量不会自动传给 Server，要在 `env` 中列出。
- Server 名不要含下划线：MCP 工具的完整名是 `mcp_<server>_<tool>`，策略按下划线切分，含下划线会让规则静默失效。预设的 Server 标识都用连字符。

## 其他 Agent 的 MCP 风格

需要新增 Agent 定义时参考：

- 根键为 `mcpServers` 的 JSON，即 Claude 风格：Cursor、Kiro、Cline、Qwen Code、Antigravity。Windsurf 远程用 `serverUrl`，Qwen Code 的 `url` 表示 SSE、`httpUrl` 表示 Streamable HTTP。
- 根键不同的 JSON：VS Code 是 `servers`，Zed 是 `context_servers`，Amp 是扁平键 `amp.mcpServers`，可以通过属性路径适配。OpenCode 是 `mcp`，条目结构也不同（`command` 是单个数组，环境变量键为 `environment`），模板表达不了。
- TOML：只有 Codex。
