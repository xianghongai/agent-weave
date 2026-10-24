# 编码规范

代码审查依据的判断类规范。能由 lint、类型检查或测试保证的规则不写在这里，由 `AGENTS.md` 的验证命令负责。

## 工作区与生成

- **修改 `Workspace` 结构**时，同步 `src/lib/workspace-validation.ts` 的结构校验与 `checkIntegrity`；已发布的结构变化要升 `SCHEMA_VERSION`，并在 `src/lib/workspace-migrations.ts` 追加迁移。
- **按工具类型分支**的逻辑集中在 `resolveTool`（`src/lib/workspace-operations.ts`）、`templatesFor`（`src/lib/generate.ts`）、规则页的 `rule-owner.tsx`，以及 `src/pages/registry.ts` 中工具类型到列表页的对应关系。新增工具类型时扩展这几处，其他位置通过 `resolveTool` 的结果判断，不另写一套分支。
- **提示**的类型定义在 `src/lib/notices.ts`。生成结果中的提示按规则提示、规则的占位符提示、MCP 提示的顺序拼接，新增的提示追加到对应位置，保留已有提示。
- **预设**的内部 ID 固定且全局唯一，命名沿用 `preset-<类别>-<标识>`；预设内容只放通用的工具和路径形式，个人信息（用户名、主机名、个人绝对路径）留在本地素材里。各 Agent 的格式规则见 `docs/agent-formats.md`。

## 界面

- **实体对话框**用 `src/hooks/use-operation-form.ts` 的 `useOperationForm()`：实时校验和提交都试运行 `src/lib/workspace-operations.ts` 中的同一个操作，校验规则只在操作里写一遍。
- **需要持久化的状态**放进 `src/state/app-store.ts` 的一个 slice，并在 `src/lib/persistence.ts` 的 `PersistedState` 与 `restorePersistedState` 中补上校验和回退；组件通过 store 读写，不直接访问本地存储。导出文件和 Gist 推送只序列化工作区，新增的本机状态不能进入其中。
- **命名与文案**使用 `GLOSSARY.md` 的术语，避开各条目 _Avoid_ 列出的词。同一个概念在代码、文案和文档中用同一个词。
