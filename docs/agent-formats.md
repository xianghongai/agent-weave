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

## 其他 Agent 的 MCP 风格

需要新增 Agent 定义时参考：

- 根键为 `mcpServers` 的 JSON，即 Claude 风格：Cursor、Kiro、Cline、Qwen Code、Antigravity。Windsurf 远程用 `serverUrl`，Qwen Code 的 `url` 表示 SSE、`httpUrl` 表示 Streamable HTTP。
- 根键不同的 JSON：VS Code 是 `servers`，Zed 是 `context_servers`，Amp 是扁平键 `amp.mcpServers`，可以通过属性路径适配。OpenCode 是 `mcp`，条目结构也不同（`command` 是单个数组，环境变量键为 `environment`），模板表达不了。
- TOML：只有 Codex。
