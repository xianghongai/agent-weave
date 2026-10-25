# 01: 界面语言骨架：跟随浏览器、页脚切换、本机保存

**What to build:** 按 spec 的“界面语言模型”“持久化”“i18n 初始化与切换”“语言菜单”“静态位置与文档”几节，打通界面语言的完整链路：首次访问按浏览器语言选 `zh-CN` 或 `en`；页脚右侧的语言菜单可以切换，不需要刷新；选择保存在当前设备上，刷新后保留，不进入工作区、导出文件和 Gist。英文语言包先放一份复制自中文的占位，保证键一致、切换链路可以演示，译文由 02 完成。这个 ticket 中预设仍只有中文，但持久化恢复已经接收浏览器语言偏好，供 03 使用。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Test seam:** `src/lib/language.ts`、`src/lib/persistence.ts`

- [ ] 新增语言模块：支持的语言 `zh-CN`、`en`，源语言 `zh-CN`，兜底语言 `en`，各语言用自己写法的名称，`matchLanguage`、`resolveLanguage`；结构照 hongzhao 的同名模块，去掉其他语言和网址参数
- [ ] 持久化应用 store 新增 `language: Language | null`，与主题同一个存储键；`PersistedState` 带上它；非法值静默按 `null` 处理，不产生回退原因码；不写迁移
- [ ] `restorePersistedState` 和 `defaultPersistedState` 新增浏览器语言偏好参数，并解析出预设语言（本 ticket 中预设仍只有中文，03 才真正使用这个语言）
- [ ] i18n 初始化读 store 中的 `language` 并交给 `resolveLanguage`；每种语言包用动态 `import()` 按需加载，`fallbackLng: false`；提供 `switchLanguage`（加载、切换并保存选择）和 `currentLanguage`；初始化和切换后同步 `<html lang>` 与页面标题
- [ ] 格式化时间按 `currentLanguage()` 显示
- [ ] 页脚右侧新增语言菜单，放在 GitHub 图标左边：照 hongzhao 的语言菜单，用 shadcn 的 `Select`，透明底，`text-xs`，向上弹出，`align="end"`，调用处显式传 `alignItemWithTrigger={false}`，选项带 `lang` 属性，触发器 `aria-label` 取文案键 `footer.language`；窄屏下由隐私说明先截断。这是唯一的语言菜单，后续 ticket 不另做
- [ ] 英文界面语言文件先复制中文作为占位，`footer.language` 等新增文案两种语言都加上
- [ ] 页面描述、初始的 `<html lang>`、PWA 清单的 `description` 与 `lang` 改为英文
- [ ] `AGENTS.md` 改为界面提供简体中文和英文，写明新增文案先加简体中文再补英文，以及语言包按需加载、不放 `public/` 的理由
- [ ] 测试：语言模块（照 hongzhao 的 `language.test.ts`）；持久化（首次访问 `language` 为 `null`、恢复保存的值、非法值变 `null` 且无回退原因）；新增语言包一致性测试（照 hongzhao 的 `locales.test.ts`：合并复数后缀后键集合相同、插值变量一致、没有空文案）；隐私边界测试的 `PersistedState` 加上 `language`，导出文件与 Gist 推送都不带它
- [ ] 在浏览器中验证：英文、中文浏览器各打开一次得到对应的 `<html lang>`；切换后立即生效并在刷新后保留；窄屏页脚显示正常；运行时只向 `api.github.com` 发出请求
