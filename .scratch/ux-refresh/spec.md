# 交互体验调整

Status: ready-for-agent

## 问题陈述

第一阶段的功能都已完成，但实际使用时暴露出几类交互问题：

- 页面标题和说明各占一行，挤占了主要内容的高度。
- 列表一长，整页跟着滚动，上方的新增表单和筛选栏被滚出视口，来回操作很不方便。
- 部分说明文案难懂，或者独占一行占空间；部分 Placeholder 有歧义，比如“如 git、./gradlew”会被理解成可以一次填两个命令。
- Agent 页把所有 Agent 堆在一个列表里；Agent 对话框把几乎每个 Agent 都要配置的字段折叠在“高级”里。
- 输出页的权限与 MCP 上下堆叠，预览没有高亮和行号；MCP Server 的内容只能在普通文本框里编辑。
- 本机设置只能记一个用户名，在多种系统之间切换时要反复改写。
- 标签列表显示了工具数，但不能直接跳去看是哪些工具。
- 页脚和上方内容区分不明显。

状态层目前是自己写的最小 store，需要换成 Zustand 加 Immer，统一管理全部状态。

## 解决方案

先把状态层迁移到 Zustand 加 Immer，再在新的状态层上逐项调整界面：

- 宽屏下标题区改为一行，页面改为一屏布局，上方操作区固定，只有列表区在 Scroll Area 中滚动。
- Agent 页和输出页改用 Tabs；Agent 对话框按“基础信息 / 权限输出 / MCP 输出”分节，取消“高级”。
- 输出预览和 MCP Server 内容改用 CodeMirror，带高亮和行号。
- 本机设置按操作系统分 Tabs，每个系统各存一个用户名。
- 标签的工具数按种类拆开显示，点击后带着筛选跳到对应页面。
- 修改有歧义的文案，页脚改为紧凑的单行。

项目尚未发布，所有改动直接采用新结构，不做旧数据迁移或兼容。

## 实现决策

### 状态层

状态按生命周期和共享范围分为三层，理由见 `docs/adr/0002-state-layering.md`：

| 层                     | 内容                              | 实现                          |
| ---------------------- | --------------------------------- | ----------------------------- |
| 持久化应用 store       | 工作区、本机设置、Gist 设置、主题 | Zustand，`persist` 写入一个键 |
| 非持久化全局界面 store | 存储状态、当前选中的 Agent        | Zustand，不挂 `persist`       |
| 页面局部状态           | 页面内的 Tab、筛选条件、表单      | `useState`                    |

- 两个 store 都按 slices 组织，中间件顺序为 `devtools(persist(immer(...)))`。`devtools` 只在 `import.meta.env.DEV` 下启用。
- Zustand 和 Immer 都按官方推荐的写法使用：action 和 state 放在同一个 store 中；组件直接用 selector 订阅，一次取多个值时配合 `useShallow`；不另外包一层自定义 Hook。
- `src/lib/workspace-operations.ts` 中的工作区操作内部改用 Immer 的 `produce`，对外签名和原因码不变。
- `persist` 不设 `version`、不写 `migrate`：
  - 读取校验放在 `merge` 中，调用 lib 现有的校验函数。数据无效时回退到预设或空设置，并把回退原因写进界面 store。
  - 读取失败和 JSON 解析失败在 `onRehydrateStorage` 的 error 回调中处理，对应 `readFailed`。
  - 写入失败通过包装 `createJSONStorage` 构造的 `storage` 来捕获，把 `writeFailed` 写进界面 store，写入成功后清空。
- 主题改为持久化。CSP 禁止内联脚本，选了浅色的用户打开页面时会先看到一下深色，这一点可以接受。
- 跨页面传递的一次性意图（比如从标签页跳到工具页时带上标签筛选）通过 `history.state` 传递，不进 store，也不放进 URL 查询参数。wouter 的 hash 路由会把查询参数写进 `#` 前面的查询串，之后切换页面时也不会清掉。

### 布局

- 宽屏（md 及以上）：外壳固定为视口高度，页眉和页脚固定，各页面自己决定哪部分固定、哪部分滚动。
- 窄屏：保持整页滚动，不使用一屏布局。
- 滚动区域用 shadcn 的 Scroll Area，分节用 shadcn 的 Item，都通过 `shadcn` CLI 添加。

### 代码高亮与编辑

- 使用 CodeMirror 6，只读预览和可编辑输入框共用同一套主题，主题基于 `src/index.css` 的 CSS 变量编写，跟随 `dark` class 切换。
- JSON 使用 `@codemirror/lang-json`，TOML 使用 `@codemirror/legacy-modes`。
- 依赖只打包进用到它的懒加载页面。现有 CSP 已放行内联样式，不需要修改。

## 测试决策

- `test/` 仍只测纯函数。工作区操作改用 `produce` 后，现有测试不修改，全部通过，作为回归保障。
- 新增的纯逻辑都要有单元测试：`persist` 的 `merge` 中调用的校验与回退、标签工具数按种类的统计、本机设置按系统取用户名并展开。
- 增加一条测试，保证导出文件和 Gist 推送的内容只包含工作区，不含 Gist Token、Gist ID、本机设置和主题。
- 涉及界面的改动都在浏览器中实际验证，并确认运行时只向 `api.github.com` 发出请求。

## 不在范围内

- 旧本地数据的迁移与兼容：项目尚未发布，不存在旧数据。
- Agent 页的内置工具按标签筛选。
- MCP Server 内容编辑器的自动补全和实时 JSON 报错。
- 主题跟随系统。
