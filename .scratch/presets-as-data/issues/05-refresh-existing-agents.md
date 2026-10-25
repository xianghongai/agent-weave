# 05: 按调研刷新 Claude Code、Codex CLI、Antigravity 和共享内容

**What to build:** 按 spec 的“阶段二：内容”一节，以本地调研资料（`docs.local/资料/` 下的 Permission、MCP、Tools 三份）为依据，重新确定已有三个 Agent 的内置工具、作用域与说明，补全有理由的预设规则描述，并写明哪些产品不收录、为什么。

**Blocked by:** 04

**Status:** done

**Test seam:** `src/lib/generate.ts`（经由预设测试中的生成快照）

- [x] 内置工具按“受权限规则控制，并且用户有理由单独放行或拒绝”的标准重新确定；不需要审批的工具不收录；规则不会命中的工具（如 Claude Code 的 `Write`、`NotebookEdit`、`Glob`）不收录，并在相近工具的描述中说明
- [x] 三个 Agent 的作用域、模板、说明与调研一致（如 Claude Code 的 `Read` 规则同时覆盖读取类工具；Antigravity 官方公开的只有 CLI 设置文件；Codex 的 permission profiles 仍是 beta，继续只输出 MCP）
- [x] 命令工具与共享规则中有特别理由的规则填写描述（如 `rm` 整体询问、`git push --force` 拒绝），整体允许的规则留空
- [x] 在 Agent 目录中用 JSONC 注释列出不收录的产品（OpenCode、Amp、Zed、Kimi Code、Kiro、Continue、Trae、VS Code Copilot、Copilot CLI 等）及卡在哪里，参照 ADR 0001
- [x] 生成快照随内容更新，变化逐条核对，确认是预期的变化
- [x] `docs/agent-formats.md` 中这三个 Agent 的格式规则和已知的坑按调研更新，调研日期改为 2026-10-24
- [x] 预设零警告、守卫测试通过
