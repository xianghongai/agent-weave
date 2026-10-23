import { SCHEMA_VERSION } from '@/lib/workspace';

/*
 * 工作区的版本迁移：把旧版本的工作区逐级升到当前版本，再交给校验。
 * 结构变化时递增 `SCHEMA_VERSION`，并在 `WORKSPACE_MIGRATIONS` 中追加一项从上一版本升级的迁移。
 * 迁移面对的是未经校验的旧数据，只需改写它负责的那部分；结果是否合法由后续校验判断。
 */

/** 把版本 `from` 的工作区升到 `from + 1`。新数据的 `schema_version` 由框架写入，迁移不需要处理。 */
export interface WorkspaceMigration {
  from: number;
  migrate: (workspace: Record<string, unknown>) => Record<string, unknown>;
}

/** 站点内置的迁移。当前只有版本 1，因此为空。 */
export const WORKSPACE_MIGRATIONS: readonly WorkspaceMigration[] = [];

/**
 * 从 `version` 逐级迁移到当前版本。
 * 缺少某一级迁移，或迁移本身出错（旧数据结构不符合预期）时返回 `null`。
 */
export function migrateWorkspace(
  workspace: Record<string, unknown>,
  version: number,
  migrations: readonly WorkspaceMigration[]
): Record<string, unknown> | null {
  let current = workspace;
  for (let from = version; from < SCHEMA_VERSION; from++) {
    const step = migrations.find((migration) => migration.from === from);
    if (!step) {
      return null;
    }
    try {
      current = { ...step.migrate(current), schema_version: from + 1 };
    } catch {
      return null;
    }
  }
  return current;
}
