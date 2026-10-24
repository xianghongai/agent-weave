# 02: 列表页与字段说明收进问号并改写为 Markdown

**What to build:** 按 spec 的“说明文字”一节，把四个列表页标题下的说明收进 `HelpPopover`，并把含代码的说明改写成 Markdown。Agent 页的模板说明见 03。

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] 权限规则、工具、MCP Server、标签四个列表页标题下的说明移进标题旁的 `HelpPopover`，页面上不再另起一行
- [ ] 这些说明改写成 Markdown：拆成要点，命令、路径、模板、占位符用行内代码标出，意思不删减
- [ ] 字段说明中含代码的改用 `<Markdown>` 渲染并改写文案，例如 MCP Server 内容说明里的 `${VAR}`、内置工具规则说明里的 `./src/`、模式输入框的说明；纯文字的说明保持原样
- [ ] 文案仍在 `src/locales/zh-CN.json` 中，`pnpm check-types` 通过
- [ ] 在浏览器中验证：四个列表页标题区各占一行，悬停问号能看到完整说明，行内代码样式正确
