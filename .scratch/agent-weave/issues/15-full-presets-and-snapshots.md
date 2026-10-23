# 15: 完整预设与快照测试

**What to build:** 首次打开站点的用户拿到一份可以直接使用的完整预设，包括：常用命令工具及其标签和高危标记，常用 MCP Server，Claude Code、Antigravity、Codex CLI 三个 Agent 定义及其内置工具，以及一套经过整理的共享规则和内置工具规则。每个预设 Agent 的输出都有快照测试保护。

预设的原始素材是用户提供的 Claude Code 与 Antigravity 实际配置副本，存放在不纳入版本控制的本地资料目录中。素材只用于整理，不直接打包。整理原则见 spec 的“预设内容”一节。

**Blocked by:** 07, 08, 09, 10, 12

**Status:** ready-for-agent

- [ ] 共享规则取两份配置的并集，并按正确性整理：去掉被更宽规则完全覆盖的冗余规则（如已有 `sudo` 拒绝时去掉 `sudo rm`）；去掉不是真实命令名的条目（如 `ripgrep`、`tealdeer`）；保留“整体允许加特定拒绝”的组合
- [ ] 每个 MCP Server 都有一条共享的 `allow` 规则
- [ ] 内置工具规则按各 Agent 实际配置整理（如 Claude Code 的 `WebFetch`、`WebSearch`，Antigravity 的 `read_file(*)`、`read_url(*)`、`execute_url(*)` 和写文件目录）
- [ ] 脱敏：不含个人用户名、主机名或个人绝对路径；路径改为 `{{home}}` 或 `~` 形式，`filesystem` MCP 的根目录参数改为 `{{home}}`；MCP 内容中自带的 `description` 挪到 MCP Server 的描述字段
- [ ] 高危工具：`rm`、`sudo`、`dd`、`mkfs`、`chmod`、`chown`、`curl`、`wget`、`nc`、`socat`
- [ ] 命令工具按社区通行的用途大致分配标签，一个命令可以有多个标签
- [ ] 预设源码按实体拆分，所有条目的内部 ID 都是固定值
- [ ] 预设工作区通过导入校验
- [ ] 对每个预设 Agent 运行生成接缝，生成快照测试
- [ ] 交付前定向搜索预设内容，确认没有个人信息
