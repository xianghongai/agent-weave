# 01: 状态层迁移到 Zustand 加 Immer

**What to build:** 用 Zustand 加 Immer 替换 `src/state/` 中自己写的 `createStore()`。按 spec 的“状态层”一节分成持久化应用 store 和非持久化全局界面 store，`src/lib/` 中的工作区操作内部改用 `produce`。除主题改为持久化以外，界面行为不变。

**Blocked by:** 无

**Status:** done

- [ ] 用 pnpm 安装 `zustand` 和 `immer`；删除 `src/state/create-store.ts`，`src/state/` 中不再保留自写的 store 实现
- [ ] 持久化应用 store 包含工作区、本机设置、Gist 设置、主题四个 slice，中间件顺序为 `devtools(persist(immer(...)))`，`persist` 只写一个存储键；action 不进入持久化内容
- [ ] 非持久化全局界面 store 包含存储状态（回退原因 `fallback`、无法保存的原因 `unsaved`）和当前选中的 Agent；输出页改为从这里读写选中的 Agent
- [ ] `devtools` 只在 `import.meta.env.DEV` 下启用，生产构建不包含它
- [ ] `persist` 不设 `version`、不写 `migrate`；`merge` 调用 lib 现有的校验函数，工作区无效时回退到预设、设置无效时回退到空设置，并把原因写进界面 store
- [ ] 读取失败和 JSON 解析失败在 `onRehydrateStorage` 的 error 回调中处理；写入失败通过包装 `createJSONStorage` 捕获，写入 `unsaved: 'writeFailed'`，写入成功后清空；存储提示横幅照常工作
- [ ] 主题持久化：启动时恢复上次的选择，由 store 的订阅同步 `<html>` 上的 `dark` class；更新 `index.html`、`theme.ts` 中“不持久化”的注释
- [ ] `src/lib/persistence.ts` 去掉三个独立存储键和对应的读写函数，只保留 `persist` 用得到的纯函数；不读、不删旧键
- [ ] `src/lib/workspace-operations.ts` 中的工作区操作内部改用 `produce`，对外签名和原因码不变，现有测试不修改并全部通过
- [ ] 组件直接用 store 的 selector 订阅，一次取多个值时用 `useShallow`；删除 `useWorkspace()`、`runOperation()` 等包装函数，`useOperationForm()` 改为调用 store 中的 action
- [ ] 新增测试：导出文件和 Gist 推送的内容只包含工作区，不含 Gist Token、Gist ID、本机设置和主题
- [ ] 新增测试覆盖 `merge` 中的校验与回退：数据有效、工作区结构无效、版本过新、设置结构无效
- [ ] 改写 AGENTS.md 中 `src/state/` 一节，说明两个 store 的职责、页面局部状态用 `useState`，以及跨页面意图通过 `history.state` 传递
- [ ] 在浏览器中验证：各页面的增删改、刷新后数据保留、主题刷新后保留、Redux DevTools 能看到 action；运行时只向 `api.github.com` 发出请求
