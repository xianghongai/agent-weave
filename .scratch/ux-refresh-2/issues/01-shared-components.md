# 01: 共用组件：帮助气泡、Markdown 与表单弹窗

**What to build:** 按 spec 的“共用组件”一节新增 `HelpPopover`、`<Markdown>` 和表单弹窗组件，并把现有的全部表单弹窗换成表单弹窗组件。说明文案的改写不在这张工单里。

**Blocked by:** 无

**Status:** done

- [x] 用 pnpm 安装 `markdown-to-jsx`；新增 `src/components/markdown.tsx`，开启 `disableParsingRawHTML`，行内代码、列表、链接使用站点样式，链接在新标签页打开并带 `rel="noreferrer"`
- [x] 新增 `src/components/help-popover.tsx`：问号图标按钮，悬停打开，带无障碍标签，正文用 `<Markdown>` 渲染；`src/pages/rules/pattern-label.tsx` 改用它
- [x] 新增 `src/components/form-dialog.tsx`：只接受 `size: 'narrow' | 'wide'`（`sm:max-w-lg` / `sm:max-w-3xl`），点空白处不关闭，按 Esc 也不关闭；Base UI 的相关 API 先用 context7 查证
- [x] 标签、命令工具、权限规则、内置工具对话框改用窄宽度，Agent、MCP Server 对话框改用宽宽度；各对话框里不再单独写宽度
- [x] `AlertDialog` 确认框不改
- [x] 在浏览器中验证：各表单弹窗点空白处和按 Esc 都不关闭，关闭按钮、取消、保存正常；宽度只有两种；深浅主题下气泡和行内代码样式正确
