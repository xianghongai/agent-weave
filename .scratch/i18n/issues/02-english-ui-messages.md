# 02: 英文界面文案

**What to build:** 按 spec 的“语言文件”一节，把 01 留下的英文占位换成完整译文：切换到英文后，导航、页面、对话框、说明气泡中的 Markdown、提示与原因码文案全部是英文，计数文字有正确的单复数。

**Blocked by:** 01 界面语言骨架：跟随浏览器、页脚切换、本机保存

**Status:** done

**Test seam:** none

- [x] 英文语言文件的每个键都有英文译文；术语严格按 `GLOSSARY.md` 的 `_English_`；风格按 Microsoft Writing Style Guide（标题和按钮用 sentence case、第二人称、句子简短）
- [x] “Agent Weave”、各 Agent 产品名、命令、路径、模板和 Markdown 中的代码保持原文
- [x] 有计数的文案改用 i18next 复数：用到复数的插值变量从 `n` 改名为 `count`，简体中文文案和组件调用处同步修改；英文补 `_one` / `_other`，中文仍只有一个键
- [x] 新增测试：英文语言文件中不含中文字符，防止占位残留
- [x] 不改语言菜单和 i18n 机制
- [x] 在浏览器中把每个页面和对话框用英文过一遍，检查截断、换行和计数文字；运行时只向 `api.github.com` 发出请求

**Notes:**

- 英文模式输入框的占位文字放不下“留空表示整个工具”，改为 `push --force, or leave empty` 这类写法，完整说明放进模式的说明气泡（英文比中文多一条 “Leave it empty to cover the whole tool/server.”）。
- 决策筛选框去掉 `w-28`，改用 `FilterSelect` 的默认宽度，容下 “All decisions”。
- 浏览器验证用无头隔离 Chrome，覆盖 `navigator.languages` 为英文：各页面与主要对话框（本机设置、预设合并与跳过报告、新增规则、Agent 权限输出、Gist 认证、删除确认）在 1280、800、390 宽度下检查；复数（1 rule / 4 rules、1 entry / 2 entries 等）正确；运行时请求只发往本地开发服务器。工作区里的中文来自预设数据，属于 ticket 03。
