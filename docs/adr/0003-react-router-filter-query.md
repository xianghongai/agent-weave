# 路由换成 React Router，列表筛选条件放进 URL 查询串

规则、工具、MCP Server 三个列表页有筛选条件，从其他页面跳过来时也会带着条件，比如从标签页带着标签跳到工具页、从工具列表带着工具跳到规则页。原来页面内的筛选用 `useState`，跳转带来的条件用 `history.state` 传递，见 ADR 0002。这样有两种来源，而且两种都不可靠：

- 页面内设置的筛选条件刷新后丢失，也不能复制链接给别人；
- 带过来的条件存在当前历史记录中，在页面内清除后，后退、前进或刷新都会让它重新出现。

把筛选条件统一放进当前页面的 URL 查询串就能解决：带过来的条件也只是当前页面的查询串，和页面内设置的没有区别。

wouter 的 hash 路由做不到这一点，它把查询串写在 `#` 前面（`/?tag=vcs#/tools`），切换页面时不会清掉。要么自己写一个 location hook 把查询串挪进 hash，要么换成原生支持的路由库。前者是绕过库的限制，我们选择后者：React Router 的 `HashRouter` 把路径和查询串都放在 `#` 之后（`#/tools?tag=vcs`），`useSearchParams` 读写的就是当前页面的查询串。打包体积会大一些，但对静态站点可以接受。

## Decision

- 路由使用 React Router 的 `HashRouter`（声明式模式），设 `useTransitions={false}`：工作区 store 基于 `useSyncExternalStore`，受查询串控制的输入框也要求同步更新，都不适合放在 transition 中。
- 列表页的筛选条件只存在于查询串中，页面渲染时从查询串读出。筛选条件和查询串的互转是 `src/lib/filter-query.ts` 中的纯函数：取默认值的条件不写；读回时取值无效或指向已删除的条目，只忽略这一个条件。
- 页面内修改筛选条件时替换当前历史记录，不新增记录，后退直接回到上一个页面。跨页面跳转用 `<Link>` 带上目标页面的查询串，正常新增记录。
- 页面切换动画只按路径播放，查询串变化不算切换页面。

## Considered Options

- **保留 wouter，自己写 location hook 把查询串放进 hash**：体积最小，但要维护一层绕过库限制的代码。
- **保留 wouter，跳转意图继续用 `history.state`**：不能解决刷新丢失和清除后重现的问题。
- **换成 React Router（采用）**。

## Consequences

- ADR 0002 中“跨页面的一次性意图通过 `history.state` 传递”一条被取代；页面内的 Tab、表单仍然用 `useState`。
- 筛选条件中的标签、工具、Agent 用内部 ID 表示，链接只在同一个工作区中有意义。
