# 03: Agent 清单与 Agent 对话框细节

**What to build:** 按 spec 的“Agent 页”一节调整 Agent 清单和 Agent 对话框，包括作用域名称的候选和 Claude Code 预设的改名。

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Agent 清单卡片中的权限输出和 MCP 输出改为上下两行
- [ ] “新增内置工具”改为带加号图标的 `outline` 小按钮
- [ ] Agent 对话框中基础信息、权限输出、MCP 输出三个分区的标题前依次加 `InfoIcon`、`ShieldCheckIcon`、`PlugIcon`
- [ ] MCP 输出的“风格”改用 `TabsList` 做分段选择，样式与本机设置中选择操作系统的控件相同；风格说明收进 `HelpPopover`
- [ ] 命令工具模板、MCP 工具模板、内置工具模板的“有模式模板”“无模式模板”字段名旁边各放一个 `HelpPopover`，每个气泡写明用途、可用的占位符、示例和模板为空时的结果（文案见 spec），用 Markdown 书写；去掉原来独占一行的模板说明和“模板为空时……”
- [ ] 用 `shadcn` CLI 添加 Base UI `combobox`，作用域名称改为可输入的下拉框：候选为用户级、项目级、项目本地级，放在文案文件中；也可以输入别的名称，不做校验；选中后不自动填写说明
- [ ] Claude Code 权限输出的作用域“本地级”改名为“项目本地级”，相关测试相应更新；不写迁移
- [ ] 在浏览器中验证：清单卡片高度整齐；对话框中的图标、分段选择、模板气泡、作用域下拉（选择和自由输入）都正常
