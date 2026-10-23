# 01: 站点骨架与部署

**What to build:** 打开站点就能看到一个可用的空壳。顶部导航包括权限规则、工具、MCP Server、标签、Agent、输出、同步，各页暂时只放占位内容。页脚写明“数据只保存在你的浏览器和你自己的 Gist 中，本站不收集任何数据”。默认深色主题，可以切换。推送到主分支后自动部署到 GitHub Pages。

技术栈、目录习惯和校验命令沿用 `hongzhao`，但不沿用它“不联网、不存储”的约束。详见 spec 的“技术栈与部署”一节。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 使用 Vite、React、Tailwind CSS v4、shadcn/ui（Base UI），依赖版本由项目清单锁定，Node 和 pnpm 版本由 mise 管理
- [ ] 格式检查、lint、类型检查、Vitest、构建都可以运行并通过，至少有一个示例测试
- [ ] 构建产物注入 CSP，`connect-src` 只放行 `'self'` 和 `https://api.github.com`，不引用任何 CDN
- [ ] 界面文案全部来自 zh-CN locale 文件，组件中不写死文案
- [ ] 默认深色主题，可以切换；viewport 不禁止缩放，窄屏下布局可用
- [ ] CI 在提交时运行全部校验；GitHub Pages 工作流可以部署构建产物
- [ ] 项目 `AGENTS.md` 补充本项目的约束、目录职责和验证命令
