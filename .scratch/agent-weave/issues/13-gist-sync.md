# 13: Gist 同步

**What to build:** 用户可以通过自己的 GitHub Gist，在多台设备之间手动同步工作区。同步页说明如何创建只有 Gist 权限的 Token（经典 Token 勾选 `gist`，或 Fine-grained Token 授予 Gists 读写），并说明 Secret Gist 不是加密存储，知道链接的人都可以访问。

第一次推送且没有填写 Gist ID 时，工具自动创建一个 Secret Gist（文件名 `agent-weave.json`），并记住它的 ID。在另一台设备上填写同一个 ID 就可以拉取。推送和拉取都是手动整体覆盖：覆盖前并列显示远端和本地的更新时间，由用户确认。

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] Gist 客户端由调用方注入 `fetch`，只访问 `api.github.com`
- [ ] 推送：没有 ID 时创建 Secret Gist 并保存 ID；有 ID 时更新 `agent-weave.json`
- [ ] 拉取：读取 `agent-weave.json` 的内容，交给 11 的导入流程校验；文件缺失或内容被截断时返回原因码
- [ ] 推送前和拉取前都先读取远端，显示双方的 `updated_at`，确认后再覆盖
- [ ] 原因码区分 Token 无效或权限不足、Gist 不存在、文件缺失、网络失败、远端内容无效，界面翻译为提示
- [ ] Token 和 Gist ID 使用独立的本地存储键，不进入工作区，也不进入导出文件
- [ ] 不做自动同步，也不做合并
- [ ] Gist 接缝的测试用假的 `fetch` 覆盖：首次推送创建、带 ID 推送更新、拉取、各个错误原因码
- [ ] 在浏览器中实际验证，运行时只向 `api.github.com` 发出请求
