# 06: 新增 Qwen Code、CodeBuddy Code、Devin CLI

**What to build:** 按 spec 的“阶段二：内容”一节，预设新增三个与 Claude Code 写法相近的 Agent：都是 allow、ask、deny 三列表，规则写作 `工具(模式)` 字符串，权限和 MCP 都能输出。依据是本地调研资料（`docs.local/资料/` 下的 Permission、MCP、Tools 三份）。

**Blocked by:** 04

**Status:** ready-for-agent

**Test seam:** `src/lib/generate.ts`（经由预设测试中的生成快照）

- [ ] 每个 Agent 一个文件，优先级省略（取 0）
- [ ] 权限输出：属性路径、作用域（用户级、项目级、项目本地级等）、决策键、命令模板与 MCP 模板与调研一致（如 Qwen Code 的 `Bash(git *)` 与 `mcp__server`，Devin CLI 的 `Exec(prefix)` 与 `mcp__server__*`）
- [ ] 内置工具按 05 的标准确定，路径锚点等差异写进工具描述（如 Qwen Code 的 `Read` 是覆盖多个读取类工具的元类别）
- [ ] 动手前先查官方文档，确认 CodeBuddy Code 和 Devin CLI 的 MCP 配置路径与根键；查不到可靠来源时，该 Agent 不输出 MCP，并在作用域说明或注释中写明
- [ ] 文字都写成文案键，中文进预设语言文件
- [ ] 生成快照覆盖这三个 Agent 的权限与 MCP 输出
- [ ] `docs/agent-formats.md` 补上这三个 Agent 的格式规则和已知的坑
- [ ] 预设零警告、守卫测试通过
