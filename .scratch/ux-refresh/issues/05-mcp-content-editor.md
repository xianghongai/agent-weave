# 05: MCP Server 内容编辑器

**What to build:** MCP Server 对话框中的“内容”输入框换成 CodeMirror 可编辑实例，带 JSON 高亮和行号，复用 04 的主题。

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] 编辑器提供 JSON 高亮、行号、括号匹配、自动缩进，按 Tab 键缩进
- [ ] 不做自动补全，也不做实时 JSON 报错；校验仍在提交时进行，规则不变（只检查是不是 JSON 对象），错误显示方式不变
- [ ] 保留 CodeMirror 的默认键盘行为：按 Esc 后再按 Tab 可以离开编辑器
- [ ] 字号窄屏 16px、宽屏 14px，避免 iOS Safari 在获得焦点时放大页面
- [ ] 与表单字段的标签、`aria-invalid`、错误提示正确关联
- [ ] 在浏览器中验证：新增和编辑 MCP Server、无效 JSON 的提交报错、深浅色切换、键盘离开编辑器，以及 CSP 没有报错
