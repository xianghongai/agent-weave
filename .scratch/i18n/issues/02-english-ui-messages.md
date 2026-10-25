# 02: 英文界面文案

**What to build:** 按 spec 的“语言文件”一节，把 01 留下的英文占位换成完整译文：切换到英文后，导航、页面、对话框、说明气泡中的 Markdown、提示与原因码文案全部是英文，计数文字有正确的单复数。

**Blocked by:** 01 界面语言骨架：跟随浏览器、页脚切换、本机保存

**Status:** ready-for-agent

**Test seam:** none

- [ ] 英文语言文件的每个键都有英文译文；术语严格按 `GLOSSARY.md` 的 `_English_`；风格按 Microsoft Writing Style Guide（标题和按钮用 sentence case、第二人称、句子简短）
- [ ] “Agent Weave”、各 Agent 产品名、命令、路径、模板和 Markdown 中的代码保持原文
- [ ] 有计数的文案改用 i18next 复数：用到复数的插值变量从 `n` 改名为 `count`，简体中文文案和组件调用处同步修改；英文补 `_one` / `_other`，中文仍只有一个键
- [ ] 新增测试：英文语言文件中不含中文字符，防止占位残留
- [ ] 不改语言菜单和 i18n 机制
- [ ] 在浏览器中把每个页面和对话框用英文过一遍，检查截断、换行和计数文字；运行时只向 `api.github.com` 发出请求
