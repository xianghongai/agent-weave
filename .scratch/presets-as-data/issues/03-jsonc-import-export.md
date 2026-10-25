# 03: 导入、导出和 Gist 改用 JSONC

**What to build:** 按 spec 的“工作区文件与 Gist”一节，用户导出的是 `.jsonc` 文件，可以在编辑器里给它加注释；导入文件和拉取 Gist 时，带注释和尾随逗号的内容都能正常解析。

**Blocked by:** None (can start immediately)

**Status:** done

**Test seam:** `src/lib/workspace-file.ts`

- [x] 从 npm 安装 `jsonc-parser`（04 也会用到，先合并的一方添加）
- [x] 导入改用 `jsonc-parser` 解析，允许注释和尾随逗号；无法解析时仍返回“无法解析”的原因码
- [x] 导出文件名改为 `agent-weave-YYYY-MM-DD.jsonc`，内容仍是格式化的纯 JSON
- [x] 导入框同时接受 `.json` 和 `.jsonc`
- [x] Gist 中的文件名改为 `agent-weave.jsonc`，推送和拉取都使用它；相关原因码的说明与界面文案同步更新；不兼容旧文件名
- [x] 浏览器本地存储不变，仍按 JSON 读写
- [x] 测试覆盖：带注释和尾随逗号的文本能导入；导出的文件名；Gist 读写的文件名与 JSONC 解析
- [ ] 在浏览器中验证：导出得到 `.jsonc` 文件，加上注释后可以导入；运行时只向 `api.github.com` 发出请求
