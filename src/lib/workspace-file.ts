import type { Workspace } from '@/lib/workspace';
import { WORKSPACE_MIGRATIONS, type WorkspaceMigration } from '@/lib/workspace-migrations';
import { type WorkspaceProblem, parseWorkspace } from '@/lib/workspace-validation';

/*
 * 工作区文件：工作区与 JSON 文本之间的转换。
 * 导入文件、读取本地存储、拉取 Gist 都从这里进入，统一经过解析、迁移和校验。
 */

/**
 * - `parseFailed`：文本不是合法的 JSON，如空文件或内容被截断；
 * - 其余见 `WorkspaceProblem`。
 */
export type ImportProblem = 'parseFailed' | WorkspaceProblem;

export type ImportResult = { workspace: Workspace } | { problem: ImportProblem };

/**
 * 把一段 JSON 文本转成当前版本的工作区：解析、迁移旧版本、校验结构与引用。不抛异常。
 * 结果保留文本中的 `updated_at`，以便同步时与其他副本比较。
 * `migrations` 只在测试时替换。
 */
export function importWorkspace(
  text: string,
  migrations: readonly WorkspaceMigration[] = WORKSPACE_MIGRATIONS
): ImportResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { problem: 'parseFailed' };
  }
  return parseWorkspace(value, migrations);
}

export interface WorkspaceFile {
  /** 如 `agent-weave-2026-10-23.json`，日期取本地时间。 */
  fileName: string;
  text: string;
}

/**
 * 把工作区导出为文件。内容只有工作区本身，便于放心分享：
 * Gist 设置和本机设置不属于工作区，即使调用方传入的对象上带有其他属性，也不会写出。
 */
export function exportWorkspace(workspace: Workspace, now: Date = new Date()): WorkspaceFile {
  const { schema_version, updated_at, tags, command_tools, mcp_servers, agents, rules } = workspace;
  const content: Workspace = { schema_version, updated_at, tags, command_tools, mcp_servers, agents, rules };
  return { fileName: `agent-weave-${localDate(now)}.json`, text: `${JSON.stringify(content, null, 2)}\n` };
}

function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
