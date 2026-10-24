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

## Qwen Code

依据 Qwen Code 0.26.0 与仓库 `main` 的设置文档（`docs/users/configuration/settings.md`）。

- 权限位于 `settings.json` 的 `permissions.allow`、`ask`、`deny`，判定顺序为 deny、ask、allow。用户级在 `~/.qwen/settings.json`，项目级在 `.qwen/settings.json`，没有项目本地级文件；各作用域的列表合并生效。项目设置只在受信任的文件夹中生效。
- 旧键 `tools.allowed`、`tools.exclude` 仍被读取，分别等价于 `permissions.allow`、`deny`；`tools.core` 已废弃。`permissions.allow` 只是自动批准，不会禁用或隐藏工具。
- 规则写作 `ToolName` 或 `ToolName(specifier)`，规范名（`run_shell_command`、`web_search`）和别名（`Bash`、`Read`）都可以用。`web_search` 没有 PascalCase 别名，预设用规范名。
- `Read`、`Edit` 是元类别：`Read` 覆盖读取文件、搜索内容、查找文件与列目录，只限读取文件时用 `ReadFile`；`Edit` 覆盖 `edit`、`write_file`、`notebook_edit`，因此预设不单列 `Write`。
- 路径锚点与 Claude Code 相近，但**单个前导 `/` 表示项目根**，绝对路径写 `//abs`。路径规则同样要写成 `~/` 形式，不能用 `{{home}}`。
- 命令规则写作 `Bash(git *)`，按词边界匹配，不匹配 `gitk`；`Bash(git*)` 的行为不同。`WebFetch(example.com)` 直接写域名，同时覆盖子域名。
- 文件与网络规则也作用于等价的 Shell 命令：拒绝 `Read(./.env)` 后，`cat .env` 也会被拦截。
- MCP 规则写作 `mcp__<server>` 或 `mcp__<server>__<tool>`。整工具拒绝不会把 MCP 工具从注册表中移除，只在运行时拒绝。
- MCP 配置与权限在同一个 `settings.json` 中，根键 `mcpServers`。远程 Server 的 `url` 表示 SSE、`httpUrl` 表示 Streamable HTTP，与 Claude Code 的 `type` 加 `url` 不同；预设的 Server 都是 stdio，不受影响。`type` 不是 Qwen Code 的字段，预计会被忽略，没有在真实的 Qwen Code 上验证过。
- 环境变量支持 `$VAR` 与 `${VAR}`。

## CodeBuddy Code

依据 CodeBuddy Code 2.162.0 的官方 CLI 文档（`www.codebuddy.ai/docs/cli/iam`、`settings`、`mcp`）。

- 权限与 Claude Code 高度兼容：`settings.json` 的 `permissions.allow`、`ask`、`deny`，用户级 `~/.codebuddy/settings.json`、项目级 `.codebuddy/settings.json`、项目本地级 `.codebuddy/settings.local.json`。拒绝规则永远优先，任一作用域的拒绝都生效。
- 判定顺序分层：钩子、拒绝、可信允许、命令安全检查、询问、绕过、非可信允许、模式默认值。信任仓库之前，项目级的允许规则属于非可信层，不能跳过命令安全检查。
- 命令规则：官方文档只给出精确匹配 `Bash(npm run build)` 与前缀 `Bash(npm run test:*)` 两种写法，没有说明 Claude Code 的 `Bash(git push *)` 是否等价，因此预设用 `:*`。复合命令的允许要求每个子命令都匹配，拒绝与询问只要任一子命令匹配。
- 路径锚点与 Claude Code 相同，**单个前导 `/` 表示相对设置文件所在目录**：`/src/**` 写在项目设置中指项目下的 `src`，写在用户设置中指 `~/.codebuddy/src`。路径规则写成 `~/` 形式，不能用 `{{home}}`。
- `Edit` 规则作用于所有改写文件的内置工具，`Read` 规则尽量作用于 Grep、Glob、LS 等读取类工具，因此预设不单列它们。`WebFetch(domain:example.com)` 与 Claude Code 写法相同；`WebSearch` 的模式写法没有公开。
- MCP 规则：`mcp__<server>` 等价于 `mcp__<server>__*`，`mcp__*` 只能用于拒绝或询问。规则不区分大小写，连字符与点视为下划线。
- MCP 配置是独立的 JSONC 文件，根键 `mcpServers`：项目级 `.mcp.json`，用户级 `~/.codebuddy/.mcp.json`（旧路径 `~/.codebuddy/mcp.json`、`~/.codebuddy.json`，同一作用域只读取存在的第一个文件）。本地级写在 `~/.codebuddy.json` 的 `projects.<工作区路径>` 下，属性路径随工作区变化，预设不输出。
- 文档要求写 `type`（`stdio`、`sse`、`http`），省略时按 `command` 或 `url` 推断。支持 `${VAR}` 与 `${VAR:-default}`，作用于 `command`、`args`、`env` 的值、`url` 与 `headers` 的值。
- `defaultMode: "auto"` 只能来自用户设置或命令行；`trustAll` 只跳过目录信任，不跳过工具审批。

## Devin CLI

依据官方文档 `docs.devin.ai/cli/reference/permissions`、`cli/reference/configuration/config-file` 与 `cli/extensibility/mcp/configuration`。

- 权限位于 `config.json` 的 `permissions.allow`、`ask`、`deny`：用户级 `~/.config/devin/config.json`（Windows 为 `%APPDATA%\devin\config.json`），项目级 `.devin/config.json`，项目本地级 `.devin/config.local.json`。优先级从高到低为组织策略、会话授权、项目本地、项目、用户，列表跨层合并。
- 同一层内先看 deny，再看 ask，最后看 allow，没有规则命中时询问。例外：更具体的命令或 MCP 允许规则可以覆盖同层较宽的询问规则（如 `ask: ["exec"]` 加 `allow: ["Exec(git status)"]`），**路径 glob 不适用这个例外**。
- 命令规则写作 `Exec(git push)`，按整词前缀匹配：`Exec(git)` 匹配 `git status`，不匹配 `gitk`、`github-cli`，结尾不写 `*`。
- 路径规则 `Read(glob)`、`Write(glob)`：`~` 展开为主目录，前导 `/` 是绝对路径，**不带前缀相对当前工作目录**，`Read(**)` 只匹配当前目录下的文件。因此 Devin 的路径规则可以用 `{{home}}`。`Write` 同时控制 `edit` 与 `write` 两个工具。
- 只写工具名的规则只有 `read`、`edit`、`grep`、`glob`、`exec` 五个，没有 `write` 和 `fetch`。预设中整体写入用 `Write(/**)` 表达；整体抓取没有文档写法，模板留空，对应规则进入跳过的规则。
- `Fetch(pattern)` 使用 WHATWG URL Pattern，不是普通 glob；`Fetch(domain:npmjs.org)` 匹配该域名下的任意路径，不含子域名。
- MCP 规则写作 `mcp__<server>__<tool>`、`mcp__<server>__*`、`mcp__*`，文档没有不带后缀的 `mcp__<server>`，所以整个 Server 输出为 `mcp__<server>__*`。
- MCP 配置从 v3000.3 起是独立的 `mcp_config.json`，根键 `mcpServers`：项目级 `.devin/mcp_config.json`，项目本地级 `.devin/mcp_config.local.json`（`devin mcp add` 的默认作用域），用户级 `~/.config/devin/mcp_config.json`。旧版本写在 `config.json` 的 `mcpServers` 中，启动时自动迁移。
- 远程 Server 用 `url`，传输方式写在 `transport`（`http` 或 `sse`）而不是 `type`；stdio 条目的字段是 `command`、`args`、`env`、`disabled`，没有 `type`。预设内容中的 `type` 预计会被忽略，没有在真实的 Devin CLI 上验证过。
- **环境变量的引用写作 `${env:VAR}`**（另有 `${file:/path}`），预设内容中的 `${VAR}` 不在文档范围内，预设不改写内容，只在作用域说明中提示。
- `read_config_from.claude` 默认开启，Devin 会导入 Claude Code 的规则、技能与 MCP Server；两边都配置同一个 Server 时注意重复。

## 其他 Agent 的 MCP 风格

需要新增 Agent 定义时参考：

- 根键为 `mcpServers` 的 JSON，即 Claude 风格：Cursor、Kiro、Cline、Qwen Code、Antigravity。Windsurf 远程用 `serverUrl`，Qwen Code 的 `url` 表示 SSE、`httpUrl` 表示 Streamable HTTP。
- 根键不同的 JSON：VS Code 是 `servers`，Zed 是 `context_servers`，Amp 是扁平键 `amp.mcpServers`，可以通过属性路径适配。OpenCode 是 `mcp`，条目结构也不同（`command` 是单个数组，环境变量键为 `environment`），模板表达不了。
- TOML：只有 Codex。
