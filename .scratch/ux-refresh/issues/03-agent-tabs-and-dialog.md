# 03: Agent 页改为 Tabs，Agent 对话框分三节

**What to build:** Agent 页用 Tabs 逐个展示 Agent，每个 Tab 中是该 Agent 定义的只读摘要和内置工具。Agent 对话框按“基础信息 / 权限输出 / MCP 输出”分成三节，取消“高级”折叠区。当前选中的 Agent 与输出页共用。

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Agent 页：Tab 顺序为录入顺序，选中的 Agent 读写全局界面 store，与输出页同步；所选 Agent 被删除后回到第一个
- [ ] Tab 面板顶部放“编辑”和“删除”；下面是只读摘要：权限输出与 MCP 输出各自的作用域、属性路径、决策键名、模板、MCP 风格，未开启的部分显示“该 Agent 不输出权限/MCP”；最后是现有的内置工具区
- [ ] “新增 Agent”仍在页面右上角；编辑和新增仍走对话框，沿用 `useOperationForm()`
- [ ] 一屏布局：md 及以上标题和 Agent Tabs 固定，Tab 内容在 Scroll Area 中滚动
- [ ] 通过 `shadcn` CLI 添加 Item 组件，把 CLI 生成的 `@/lib/utils` 导入改为 `import { cn } from 'cn'`
- [ ] Agent 对话框分为三节：基础信息（名称、描述）、权限输出、MCP 输出；两个输出的开关放在各自的节标题旁，关闭时这一节只显示“该 Agent 不输出权限/MCP”
- [ ] 原来的作用域和“高级”字段合并进对应的节；删除 Collapsible 以及 `agents.advanced`、`agents.advancedHint` 等不再使用的文案键
- [ ] 输出字段校验失败时，错误显示在对应节的字段下方（原来靠自动展开“高级”来显示）
- [ ] 对话框加宽到 `sm:max-w-3xl`，标题和底部按钮固定，中间内容滚动
- [ ] 在浏览器中验证：新增、编辑、删除 Agent，开关两个输出，校验错误的显示，宽屏与窄屏
