# 07: 新增 Cursor CLI 和 Gemini CLI

**What to build:** 按 spec 的“阶段二：内容”一节，预设新增两个只能部分表达的 Agent：Cursor CLI 输出它能表达的权限，外加 MCP；Gemini CLI 只输出 MCP。依据是本地调研资料（`docs.local/资料/` 下的 Permission、MCP、Tools 三份）。

**Blocked by:** 04

**Status:** done

**Test seam:** `src/lib/generate.ts`（经由预设测试中的生成快照）

- [x] 每个 Agent 一个文件，两者的优先级都设为 50
- [x] Cursor CLI：权限只有 allow 与 deny，询问这一档的决策键留空；命令写作 `Shell(...)`，带子命令的模式表达不了时把对应模板留空，规则列为跳过的规则；MCP 写作 `Mcp(server:*)`；MCP 配置为 Claude 风格 JSON
- [x] Gemini CLI：不输出权限，在说明中写明原因（`tools.*` 列表有弃用项，参数只对 Shell 有效，MCP 的放行在另一个路径，主推的 TOML 策略引擎模板表达不了）；MCP 输出写到设置文件的 `mcpServers`
- [x] 内置工具按 05 的标准确定
- [x] 文字都写成文案键，中文进预设语言文件
- [x] 生成快照覆盖 Cursor CLI 的权限输出（含跳过的规则）与两者的 MCP 输出
- [x] `docs/agent-formats.md` 补上这两个 Agent 的格式规则和已知的坑
- [x] 预设零警告、守卫测试通过
