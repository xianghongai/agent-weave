/*
 * 提示：生成结果和规则列表上的提醒，只提醒，不影响输出。
 * 生成（`generate.ts`）与规则提示（`rule-notices.ts`）都产生提示，类型单独放在这里，两者都依赖它而不互相依赖。
 * 只供界面展示、不持久化，因此属性名使用 camelCase。
 */

/**
 * - `highRisk`：允许了高危操作，见高危提示；
 * - `conflict`：同一工具、同一模式出现不同决策的一组规则，见冲突提示；
 * - `placeholderUnexpanded`：本机设置不完整，规则模式或 MCP Server 内容中仍有路径占位符；
 * - `tomlFieldSkipped`：TOML 表达不了的 MCP Server 字段，没有写进输出。
 */
export type Notice =
  | { type: 'highRisk'; ruleId: string }
  | { type: 'conflict'; ruleIds: string[] }
  | { type: 'placeholderUnexpanded'; ruleId: string | null; serverId: string | null }
  | { type: 'tomlFieldSkipped'; serverId: string; field: string };
