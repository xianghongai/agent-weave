# Agent 定义用数据与模板描述，不为每家写代码适配器

各 Agent 的权限与 MCP 格式差异很大（`Bash(git push *)`、`command(git push)`、`mcp__a__b`、`mcp(a/b)`），常规做法是在代码里为每家写一个适配器。我们改为让 Agent 定义成为工作区里的数据：作用域路径、配置属性名、决策键名映射，命令工具和 MCP 工具的输出模板，以及该 Agent 的内置工具清单。所有模板都分为“有模式”和“无模式”两种。内置的 Agent 也走同一套数据，这样用户不改代码就能新增或修正 Agent。

## Considered Options

- **代码适配器**：表达力最强，但新增 Agent 必须发版，用户无法自行修正。
- **数据模板（采用）**：只覆盖“字符串拼接加 JSON 属性”这一类格式。

## Consequences

- 表达不了的结构不硬塞进模板。Codex CLI 的命令规则是 Starlark `prefix_rule`，路径与网址规则又在另一套 beta 配置里，因此一期 Codex 只输出 MCP（TOML）。
- MCP 输出只支持两种风格：Claude 风格的 JSON，以及 Codex 风格的 TOML。
- 工具输出不保证正确：模板由预设或用户提供，本工具只负责代入。
