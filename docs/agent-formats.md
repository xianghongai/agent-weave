# 各 Agent 的权限与 MCP 格式

预设的 Agent 定义和输出模板依据这里的事实编写。调研时间为 2026-10-24，来源以官方文档为准；具体取值以 `presets/agents/` 下各 Agent 的 JSONC 文件为准（写法见 `presets/README.md`），本文只记录数据文件里看不出来的格式规则和坑。没有收录的产品及卡在哪里，见 `presets/agents/not-included.jsonc` 中的注释。

## Claude Code

- 权限位于 `settings.json` 的 `permissions.allow`、`ask`、`deny`，判定顺序为 deny、ask、allow，与规则写得多具体无关。
- 命令规则写作 `Bash(git push *)`。旧写法 `Bash(git push:*)` 等价，但 `:*` 只在结尾生效；结尾的 ` *` 也匹配不带参数的命令。
- 路径规则（`Read`、`Edit`）采用 gitignore 风格：`~/x` 表示主目录，`./x` 或不带前缀表示当前目录，**单个前导 `/` 表示相对设置文件所在目录**，绝对路径要写 `//abs`。因此 Claude Code 的路径规则一律写 `~/` 形式；`{{home}}` 展开后是单个 `/` 开头的绝对路径，含义会出错。
- `Read(…)` 规则覆盖 `Read`、`Grep`、`Glob`、`LSP` 等读取类工具，`Edit(…)` 规则覆盖 `Edit`、`Write`、`NotebookEdit` 等修改类工具。写在 `Write`、`NotebookEdit`、`Glob` 上的路径规则会被接受但永远不会命中，因此预设不收录这三个工具，写入类权限用 `Edit`。
- `Read` 的拒绝规则会同时阻止同路径的 `Edit` 与 `Write`，但不阻止 `NotebookEdit`；不可写的目录要另写 `Edit` 拒绝规则。
- 同一个路径模式在允许与拒绝中的深度语义不同：`Edit(src/**)` 作为允许规则只匹配工作目录下的 `src`，作为拒绝或询问规则会匹配任意深度的 `src`。
- 预设的内置工具只收录受权限规则控制、需要审批的工具：`Read`、`Edit`、`WebFetch`、`WebSearch`、`Skill`、`Workflow`、`Artifact`。`Agent`、`AskUserQuestion`、`TodoWrite` 与 `Task*`、`ToolSearch`、`LSP` 等不需要审批，不收录；`Monitor` 沿用 `Bash` 的规则；`PowerShell` 只在 Windows 默认启用，命令模板按 `Bash` 输出。
- `Skill(deploy *)` 按技能名匹配；`Workflow`、`Artifact` 官方没有给出参数写法，只按工具名输出。`Artifact` 只在登录 Pro 及以上订阅时可用。
- 历史工具名 `Task` 已改为 `Agent`，`MultiEdit` 已并入 `Edit`，旧名可能被接受，但不会按预期匹配。
- 命令匹配会先拆分 `&&`、`||`、`;`、`|` 连接的复合命令，逐个子命令判定；`timeout`、`nohup` 等包装器会被剥离，`npx`、`mise exec`、`docker exec` 不会。命令规则只匹配文本，不构成安全边界。
- 项目共享设置中的允许规则要等信任工作区后才生效，拒绝与询问规则立即生效。设置文件是严格 JSON，不允许注释和尾随逗号。
- MCP 规则写作 `mcp__<server>`、`mcp__<server>__*`、`mcp__<server>__<tool>`。`mcp__*` 不能用于 `allow`，所以中立模型没有“全部 MCP”的概念，逐个 Server 输出。
- MCP 配置是 JSON，根键 `mcpServers`，项目级在 `.mcp.json`，用户级在 `~/.claude.json` 顶层。远程 Server 必须写 `type`（`http` 或 `sse`），只有 `url` 会报错。支持 `${VAR}` 与 `${VAR:-default}`。

## Antigravity

- 官方公开的权限文件只有 CLI 设置 `~/.gemini/antigravity-cli/settings.json` 的 `permissions`，预设以它为属性路径和第一个作用域。IDE 的全局权限在官方文档中只有界面描述；本机观察到它存在 `~/.gemini/config/config.json` 的 `userSettings.globalPermissionGrants` 下，预设列为第二个作用域，并提示粘贴位置。CLI 与 IDE 读取不同的文件，同一套规则需要分别配置。
- CLI 的 `/permissions` 还有 Shared、Project 两个作用域，官方没有公布存储路径，`.agents/` 下也没有权限文件，预设不列出。
- 两处都有 `allow`、`ask`、`deny`，判定顺序为 deny、ask、allow，未配置的动作默认询问，工作区内的文件读写默认允许。每条规则必须匹配 `command(…)`、`read_file(…)`、`write_file(…)`、`read_url(…)`、`execute_url(…)`、`mcp(…)`、`unsandboxed(…)` 之一，CLI 会忽略无法解析的规则。
- 权限按动作而不是工具名建模，预设的内置工具就是 `read_file`、`write_file`、`read_url`、`execute_url` 四个动作。`unsandboxed` 只对商业或企业账号生效，其他账号会忽略并警告，不收录。SDK 的 `view_file`、`create_file`、`run_command` 等是构建 Agent 用的工具名，写进权限规则不会生效。
- `command(git push)` 按词元前缀匹配，也接受 `regex:` 前缀，每个词元按锚定正则评估。命令中出现命令替换、进程替换、花括号展开、重定向等结构时，前缀匹配关闭，只有整条命令精确匹配才免询问，因此它不能当作安全边界。
- `read_file`、`write_file` 按目录递归，接受工作区相对路径和绝对路径；`write_file(path)` 同时授予读取，拒绝读取也会同时拒绝写入。`read_url`、`execute_url` 包含子域名，忽略 URL 路径；`execute_url` 控制浏览器中的点击、输入与工作流。MCP 写作 `mcp(<server>/<tool>)` 或 `mcp(<server>/*)`。
- `toolPermission = "strict"` 会让每个动作都询问，包括命中允许规则的文件读取，拒绝规则仍然生效。`trustedWorkspaces` 只接受绝对路径，不展开 `~`。
- MCP 配置是 JSON，根键 `mcpServers`，全局在 `~/.gemini/config/mcp_config.json`（IDE、App、CLI 共用），工作区在 `.agents/mcp_config.json`。远程 Server 以 `serverUrl` 为准（`url` 也被接受），只支持 Streamable HTTP。本工具不做 `url` 与 `serverUrl` 的转换。

## Codex CLI

- 不输出权限，原因见 `docs/adr/0001-agent-definition-as-data.md`：命令规则是 `~/.codex/rules/*.rules` 中 Starlark 的 `prefix_rule`（预览功能），决策为 `allow`、`prompt`、`forbidden`，多条命中时取最严格的；路径与网址规则在 beta 的权限配置文件 `[permissions.<name>]` 中，以路径或域名为键。两者都不是“按决策分组的字符串数组”，模板表达不了。
- 权限配置文件与旧的 `sandbox_mode` 互斥：任一已加载的配置出现 `sandbox_mode` 或使用 `--sandbox`，Codex 就忽略权限配置文件。域名规则还要求 `[features] network_proxy = true` 才生效，且不限制 Web 搜索与 MCP。
- 没有内置工具：Codex 以 Shell 为中心，读写搜索经 `exec_command` 执行命令、`apply_patch` 改文件完成，没有独立的 `read_file`、`grep` 等工具，审批由 `approval_policy` 与 `sandbox_mode` 决定。`approval_policy = "untrusted"` 已退役，`on-failure` 已弃用。
- 项目级 `.codex/config.toml` 与 `.codex/rules/` 只在项目受信任（`trust_level = "trusted"`）后加载。
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

- 没有废弃，但用户范围收窄了：2026 年 6 月 18 日起，免费用户和 Google AI Pro、Ultra 订阅用户已转到 Antigravity CLI，Gemini Code Assist Standard、Enterprise 许可和付费 API Key 用户仍可使用，见[官方公告](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli)。预设同时保留它和 Antigravity，在 Agent 描述中说明各自适用的用户。
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
- 预设的内置工具只收录需要审批的 `Read`、`Edit`、`WebFetch`、`WebSearch`、`Workflow`、`Artifact`、`ImageGen`、`VideoGen`，后四个只按工具名输出。`Agent`、`Skill`、`Task*`、`ToolSearch`、`LSP` 不需要审批，不收录；`AskUserQuestion`、`ExitPlanMode`、`EnterWorktree` 虽然需要审批，但没有理由事先放行或拒绝。`Artifact` 的旧名 `ShareLink` 只在权限规则中仍被匹配。
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
