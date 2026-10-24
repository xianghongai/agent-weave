# 04: 输出页嵌套 Tabs 与 CodeMirror 只读预览

**What to build:** 输出页外层是 Agent Tabs，内层是权限/MCP Tabs。高危、冲突和占位符提示移到两个 Tab 的下方，两者共用。预览改用 CodeMirror 只读实例，带高亮和行号。

**Blocked by:** 01, 02

**Status:** done

- [ ] 外层 Agent Tabs 用默认样式，选中的 Agent 读写全局界面 store；内层权限/MCP Tabs 用 `line` 样式，选中项是页面局部 `useState`，切换 Agent 时保持不变
- [ ] 某个 Agent 不输出权限或 MCP 时，对应的 Tab 仍然显示，内容为现有的“该 Agent 不输出权限/MCP”提示
- [ ] 权限 Tab 依次是：作用域、预览、复制说明、跳过的规则；MCP Tab 依次是：作用域、预览、复制说明、TOML 跳过的字段
- [ ] 高危提示、冲突提示、占位符未展开的提示放在两个 Tab 的下方，两者共用；删除“提示放在输出之前”的注释
- [ ] 一屏布局：md 及以上标题、Agent Tabs、权限/MCP Tab 标题固定，下面的 Tab 内容加上提示整体在一个 Scroll Area 中滚动；预览按实际高度展开，没有自己的滚动条
- [ ] 用 pnpm 安装 CodeMirror 6 以及 `@codemirror/lang-json`、`@codemirror/legacy-modes`；在 `src/components/` 中新增可复用的代码视图组件，05 的编辑器复用同一套主题
- [ ] 主题基于 `src/index.css` 的 CSS 变量编写，跟随 `dark` class 切换；JSON 与 TOML 都有高亮；显示行号；用鼠标选中复制时不带行号
- [ ] 复制按钮的行为不变
- [ ] 构建产物中 CodeMirror 只出现在懒加载页面的代码块里，不进入主脚本
- [ ] 在浏览器中验证：Claude Code（JSON）和 Codex CLI（TOML）的预览、深浅色切换、提示显示，以及运行时只向 `api.github.com` 发出请求、CSP 没有报错
