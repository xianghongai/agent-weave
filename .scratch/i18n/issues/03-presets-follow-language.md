# 03: 预设随界面语言

**What to build:** 按 spec 的“预设”一节和 ADR 0005，让预设有英文版：首次使用、本地数据回退、合并预设、重置为预设时，加入工作区的标签名、描述、高危说明、作用域名称和说明都用当前界面语言。切换语言不改动工作区中已有的文字。

**Blocked by:** 01 界面语言骨架：跟随浏览器、页脚切换、本机保存

**Status:** ready-for-agent

**Test seam:** `src/lib/persistence.ts`、`src/lib/preset-operations.ts`、`src/lib/preset-composition.ts`（经由 `test/presets.test.ts` 读取实际预设文件）

- [ ] 预设目录新增英文语言文件，键与中文语言文件相同；译文规则与界面相同（术语按 `GLOSSARY.md`，产品名、命令、路径、代码保持原文）
- [ ] 构建插件按语言各合成一次，`virtual:preset-workspace` 默认导出 `Record<Language, Workspace>`；构建期警告指明是哪个语言文件，警告文字不翻译
- [ ] `createPresetWorkspace(language)` 按语言返回独立副本；`mergePresets`、`resetToPresets` 增加语言参数，由界面层传入 `currentLanguage()`；`src/lib/` 不读取 i18n；合并逻辑仍按 ID 跳过已有条目
- [ ] 持久化：首次访问和工作区回退时，预设用 `resolveLanguage(保存的 language, 浏览器偏好)` 解析出的语言
- [ ] 测试：持久化按偏好列表与保存的语言取对应语言的预设（用已知条目的文字判断）；预设操作按传入语言取预设；现有预设测试对每种语言都运行（没有警告、能通过导入校验）；两种语言的工作区去掉文字字段后完全相同；快照只保留简体中文
- [ ] 预设说明文档改为每种语言一个语言文件，新增或修改预设文字时两种语言都要补
- [ ] 在浏览器中验证：英文浏览器首次打开得到英文预设；切换语言后工作区文字不变；英文下重置为预设得到英文预设；运行时只向 `api.github.com` 发出请求
