# 05: 内置工具

**What to build:** 每个 Agent 有自己的内置工具清单（如 Claude Code 的 `Read`、`Edit`、`WebFetch`、`WebSearch`，Antigravity 的 `read_file`、`write_file`、`read_url`、`execute_url`），用户可以在 Agent 页对它们增删改。用户可以对内置工具写权限规则，这些规则只出现在所属 Agent 的输出里。规则列表增加“归属”筛选（共享，或某个 Agent）。

内置工具不跨 Agent 对应：同样是“允许读文件”，Claude Code 和 Antigravity 各写一条规则。

**Blocked by:** 04

**Status:** done

- [ ] 内置工具包括标识（在所属 Agent 内唯一）、可选描述、写入类标记、有模式模板、无模式模板（如 `Read({pattern})` 与 `Read`，`read_file({pattern})` 与 `read_file(*)`）
- [ ] 录入规则时可以选择内置工具，界面标明该规则归属哪个 Agent
- [ ] 内置工具的路径模式按以 `/` 结尾的目录前缀处理，glob 由模板补全
- [ ] 规则列表的排序加入工具类型：命令工具、MCP 工具、内置工具
- [ ] 规则列表可以按归属筛选
- [ ] 删除内置工具时，级联删除指向它的规则并确认数量；删除 Agent 时，级联删除它的内置工具和相关规则
- [ ] 预设加入 Claude Code 和 Antigravity 的内置工具，Antigravity 的 `write_file` 标为写入类
- [ ] 生成接缝的测试覆盖：内置工具规则只出现在所属 Agent 中、两种模板的选择、其他 Agent 不受影响；工作区操作的测试覆盖两种级联删除
