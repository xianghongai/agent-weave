# AGENTS.md

纯静态站点，部署到 GitHub Pages。所有工具在浏览器内运行，不依赖任何后端。

## 不可违反的约束

- **网络请求只发往 GitHub API**：运行时唯一的对外请求是 Gist 同步。`build/content-security-policy.ts` 在构建产物中注入 CSP，`connect-src` 只放行 `'self'` 和 `https://api.github.com`，不得放宽；`test/content-security-policy.test.ts` 检查这一点。
- **不引用 CDN**：依赖一律从 npm 安装并随站点打包，运行时不加载任何远程脚本、样式、字体或 WASM。图片以独立文件提供，`build.assetsInlineLimit` 保持为 `0`。
- **不收集数据**：工作区只存在于浏览器本地和用户自己的 Gist 中。不接入统计、埋点或错误上报服务。
- **本机数据不外流**：Gist Token、Gist ID 和本机设置只保存在当前设备，不进入工作区、导出文件和 Gist。
- **界面文案不写在组件里**：文案放在 `src/locales/zh-CN.json`，组件通过 `useTranslation` 读取。
- **纯逻辑不含文案**：`src/lib/` 出错时返回原因码，由界面层翻译成文案。

## 目录职责

- `src/pages/`：每个页面一个目录，在 `src/pages/registry.ts` 登记后自动出现在顶部导航和路由中。登记顺序就是导航顺序，第一项也是首页；`id` 同时决定文案键 `pages.<id>.title`、`pages.<id>.description`。尚未实现的页面用 `src/components/placeholder-page.tsx` 占位。
- `src/lib/`：纯函数，不依赖 React 和 DOM，全部由 `test/` 下的单元测试覆盖。工作区模型、工作区操作、生成、Gist 客户端、持久化等模块都放在这里。
- `src/state/`：界面订阅的内存状态，都基于 `create-store.ts` 的 `createStore()`；这里只保存结果、写入本地存储、通知订阅者，不写业务逻辑。
  - `workspace-store.ts`：当前工作区。界面用 `useWorkspace()` 读取，用 `runOperation()` 执行 `src/lib/workspace-operations.ts` 中的操作。
  - `device-settings-store.ts`、`gist-settings-store.ts`：本机设置和 Gist 设置，只保存在本机，各自带有读写本地存储的问题。
  - `theme.ts`：深浅色主题，记录在 `<html>` 的 `dark` class 上。
- `src/i18n/`、`src/locales/`：界面文案。界面只提供简体中文，`zh-CN.json` 随主脚本打包，`src/i18n/i18next.d.ts` 让 `t()` 的键参与类型检查。原因码到文案的翻译函数、按语言环境显示时间等格式化函数放在 `src/i18n/` 中。
- `src/components/`：站点外壳（页眉、页脚、主题切换）、页面容器 `page.tsx`，以及多个页面共用的界面组件，如标签选择与标签徽标、筛选、高危开关与标记、复制按钮、存储提示横幅。只在一个页面中使用的组件放在该页面的目录里。
- `src/hooks/`：多个页面共用的 React Hook，如实体对话框的 `useOperationForm()`。
- `src/browser/`：直接调用浏览器 API、又不是组件的界面辅助函数，如让浏览器下载文件的 `download.ts`。
- `src/components/ui/`：shadcn/ui（Base UI）生成的组件，通过 `shadcn` CLI 添加，不做格式化和 lint。CLI 生成的 `@/lib/utils` 导入要改为 `import { cn } from 'cn'`。
- `build/`：只在构建时使用的 Vite 插件和配置，不打包进站点。
- `test/`：Vitest 单元测试，以 `*.test.ts` 命名，只测纯函数。
- `public/`：原样发布的静态文件，如站点图标。
- `.scratch/`：本地 Issue 与规格，见下文“Agent skills”。

## 技术约定

- Node 和 pnpm 的版本由 `mise.toml` 与 `package.json` 的 `packageManager` 锁定，命令通过 `mise exec --` 运行。
- Vite、React、Tailwind CSS v4、shadcn/ui（Base UI），格式化与 lint 使用 oxfmt 和 oxlint。
- 路由使用 wouter 的 hash 路由：GitHub Pages 没有服务端重写，路径放在 `#` 之后才能直接打开和刷新。`vite.config.ts` 的 `base` 为 `./`，同一份构建产物可以部署在任意子路径下。
- 设计令牌在 `src/index.css` 中用 `@theme` 声明，不使用 `tailwind.config.js`。品牌色为 `brand`。
- 默认深色主题：`index.html` 的 `<html>` 自带 `dark` class，`src/state/theme.ts` 负责切换。
- class 合并使用 `import { cn } from 'cn'`，不使用 clsx 与 tailwind-merge。
- 页面适配窄屏，但不禁止缩放：`index.html` 的 viewport 保持 `width=device-width, initial-scale=1.0`，不加 `maximum-scale`、`user-scalable=no`。
- 输入框字号在窄屏下保持 16px、宽屏 14px（`text-base md:text-sm`），避免 iOS Safari 在获得焦点时自动放大页面。
- 动效：微交互用 CSS 过渡；进场与页面切换用 `motion/react`，应用根部使用 `MotionConfig reducedMotion="user"`。

## 验证

提交前运行：

```sh
mise exec -- pnpm format:check && mise exec -- pnpm lint && mise exec -- pnpm check-types && mise exec -- pnpm test && mise exec -- pnpm build
```

CI（`.github/workflows/ci.yml`）在推送和 Pull Request 时运行同样的校验；推送到 `main` 后，`.github/workflows/pages.yml` 构建并部署到 GitHub Pages。

涉及界面的改动需在浏览器中实际验证，并确认运行时只向 `api.github.com` 发出请求。

## Agent skills

### Issue tracker

Issue 以本地 Markdown 文件的形式存放在 `.scratch/<feature-slug>/` 下。见 `docs/agents/issue-tracker.md`。

### Triage labels

沿用五个默认分诊标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局：仓库根目录一份 `GLOSSARY.md`，ADR 放在 `docs/adr/`。见 `docs/agents/domain.md`。
