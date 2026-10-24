# 06: Gist 认证配置对话框

**What to build:** 按 spec 的“Gist 认证”一节，把 Gist Token 和 Gist ID 的配置移进对话框，同步页上只保留状态和推送、拉取操作，开视频会议或截图时不会泄露认证信息。

**Blocked by:** 01

**Status:** done

- [x] 在 `src/lib/gist.ts` 中新增纯函数，根据 Gist 设置给出状态的原因码：缺 Token、缺 Gist ID、Gist ID 无效、已就绪等；界面层负责翻译
- [x] 为上述函数补单元测试：都没填、只有 Token、只有 Gist ID、Gist ID 无效、填的是 Gist 网址、两项都有效
- [x] 同步页的 Gist 卡片只显示状态和“认证配置”“推送”“拉取”三个按钮，页面上不出现 Token、Gist ID 和 Gist 链接；按钮是否可用的规则与现在一致
- [x] “认证配置”打开窄宽度的表单弹窗，内含 Token 指引、两个创建链接、安全警告、Token、Gist ID 和“打开 Gist”链接；编辑草稿，点“保存”才写入 store，Gist ID 无效时不能保存
- [x] 推送时新建的 Gist ID 仍然直接写入 store，状态随之更新
- [x] 在浏览器中验证：页面上看不到任何认证信息；保存、取消、推送、拉取都正常；运行时只向 `api.github.com` 发出请求
