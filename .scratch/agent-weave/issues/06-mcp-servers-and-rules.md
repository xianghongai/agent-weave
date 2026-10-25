# 06: MCP Server 与 MCP 规则

**What to build:** 用户可以在“MCP Server”页新增、编辑、删除 MCP Server，每个条目由标识、内容（Claude 风格的 JSON 对象）和描述组成。每个 MCP Server 自动成为一个 MCP 工具，可以直接对它写权限规则，例如 Claude Code 输出 `mcp__context7`，Antigravity 输出 `mcp(context7/*)`。输出页新增 MCP 节，JSON 风格，提供“复制”和“复制内部”。

内容只校验是不是合法的 JSON 对象，不校验字段。`${VAR}` 原样输出，本工具不处理密钥。

**Blocked by:** 04

**Status:** done

- [ ] 可以新增、编辑、删除 MCP Server；标识唯一；内容不是 JSON 对象时提示，不能保存
- [ ] 录入规则时可以选择 MCP 工具；模式填 MCP 工具名，留空表示整个 Server
- [ ] Agent 定义支持可选的 MCP 输出：风格、属性路径、作用域列表；表单的高级区可以编辑
- [ ] JSON 风格：预览按属性路径完整嵌套；“复制”是最末一段的键值对，如 `"mcpServers": {...}`；“复制内部”是各 Server 的键值对，以逗号分隔
- [ ] MCP Server 的描述不进入输出
- [ ] 删除 MCP Server 时，级联删除指向它的规则并确认数量
- [ ] 预设加入 Claude Code 与 Antigravity 的 MCP 输出、对应的 MCP 工具模板，以及少量示例 MCP Server
- [ ] 生成接缝的测试覆盖：MCP 规则两种模板、JSON 预览与两种复制文本、`${VAR}` 原样保留；工作区操作的测试覆盖级联删除
