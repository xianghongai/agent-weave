# 07: Codex CLI 的 TOML MCP 输出

**What to build:** 预设新增 Codex CLI。它没有权限输出，只有 TOML 风格的 MCP 输出：每个 MCP Server 的 JSON 内容被转换成 `[mcp_servers.<标识>]` 表，用户复制后可以直接追加到 `config.toml`。

一期不输出 Codex 的权限，原因见 ADR 0001 和 spec 的“不在范围内”一节。

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] 每个 Server 生成一个 `[<属性路径>.<标识>]` 表；嵌套对象（如 `env`）生成子表；字符串、数字、布尔值、数组按 TOML 语法输出，字符串正确转义
- [ ] 无法表达的值（如 `null`）跳过该字段，并产生提示
- [ ] TOML 风格只提供“复制”，没有“复制内部”
- [ ] Codex CLI 预设：没有权限输出，输出页显示“该 Agent 不输出权限”；MCP 属性路径为 `mcp_servers`，作用域为用户级与项目级的 `config.toml`
- [ ] 生成接缝的测试覆盖：标量、数组、嵌套子表、特殊字符转义、`null` 跳过
