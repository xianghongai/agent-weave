# 04: Agent 定义编辑与 Antigravity

**What to build:** 用户可以在“Agent”页新增、编辑、删除 Agent。基本信息（名称、描述、作用域）直接显示；属性路径、决策键名映射、命令工具与 MCP 工具的输出模板放在“高级”折叠区。预设新增 Antigravity：在输出页，它的预览显示完整的 `userSettings.globalPermissionGrants` 嵌套，“复制”只到 `"globalPermissionGrants": {...}` 这一层。

同时加入“跳过的规则”：Agent 表达不了的规则（决策键名为空、所需模板为空）列在输出旁，并附原因。没有权限输出的 Agent 只显示“该 Agent 不输出权限”的说明。

Agent 定义采用数据加模板的方式，见 ADR 0001。作用域只作提示，不影响输出内容。

**Blocked by:** 02

**Status:** done

- [ ] 可以新增、编辑、删除 Agent；名称唯一；删除前确认
- [ ] 权限输出可以缺省；属性路径支持点分的多层嵌套
- [ ] 决策键名映射默认为 `allow`、`ask`、`deny`；某一档留空时，该档的规则进入跳过的规则
- [ ] 命令工具和 MCP 工具各有有模式与无模式两个模板；所需模板为空时，规则进入跳过的规则
- [ ] 作用域列表（名称、路径、可选说明）在输出旁显示
- [ ] 输出页按 Agent 切换，跳过的规则列表带原因码对应的提示文案
- [ ] 预设 Antigravity：权限属性路径为 `userSettings.globalPermissionGrants`；主作用域是共享配置 `~/.gemini/config/config.json`，第二个作用域是 CLI 设置文件，说明中注明其属性名为 `permissions`
- [ ] 生成接缝的测试覆盖：多层属性路径的预览与复制、决策键名为空、模板为空、没有权限输出
