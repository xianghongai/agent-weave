import type { TFunction } from 'i18next';

import type { SkipReason } from '@/lib/generate';
import type { GistContentFailure, GistRequestProblem } from '@/lib/gist';
import type { PersistenceProblem } from '@/lib/persistence';
import type { Rule, ToolType } from '@/lib/workspace';
import type { ImportFailure } from '@/lib/workspace-file';
import type { OperationProblem } from '@/lib/workspace-operations';

/** 把工作区操作的原因码翻译成界面文案。 */
export function operationProblemMessage(t: TFunction, problem: OperationProblem): string {
  return t(`problems.operation.${problem}`);
}

/** 把本地存储读写的原因码翻译成界面文案；工作区回退能定位到条目时，接着指出条目 ID。 */
export function persistenceProblemMessage(t: TFunction, problem: PersistenceProblem, entryId?: string): string {
  return t(`problems.persistence.${problem}`) + entryIdMessage(t, entryId);
}

/** 把导入工作区的原因翻译成界面文案，能定位到条目时接着指出条目 ID。文案不提来源，导入文件和拉取 Gist 共用。 */
export function importProblemMessage(t: TFunction, failure: ImportFailure): string {
  return t(`problems.import.${failure.problem}`) + entryIdMessage(t, failure.entryId);
}

function entryIdMessage(t: TFunction, entryId: string | undefined): string {
  return entryId === undefined ? '' : t('problems.entryId', { id: entryId });
}

/** 把 Gist 同步的原因码翻译成界面文案；远端内容无效时附上导入流程给出的具体原因。 */
export function gistProblemMessage(
  t: TFunction,
  failure: { problem: GistRequestProblem } | GistContentFailure
): string {
  if (failure.problem === 'invalidContent') {
    const reason = importProblemMessage(t, { problem: failure.importProblem, entryId: failure.entryId });
    return t('problems.gist.invalidContent', { reason });
  }
  return t(`problems.gist.${failure.problem}`);
}

/** 把跳过的规则的原因码翻译成界面文案；文案指明是哪一档决策或哪一个模板。 */
export function skipReasonMessage(t: TFunction, reason: SkipReason, rule: Rule): string {
  switch (reason) {
    case 'decisionKeyMissing':
      return t('problems.skip.decisionKeyMissing', { decision: t(`decisions.${rule.decision}`) });
    case 'templateMissing':
      return t('problems.skip.templateMissing', {
        templates: t(TEMPLATE_GROUP[rule.tool.type]),
        template: t(rule.pattern === '' ? 'agents.withoutPattern' : 'agents.withPattern'),
      });
  }
}

/** 各工具类型的模板在 Agent 表单中的名称。 */
const TEMPLATE_GROUP = {
  command: 'agents.commandTemplates',
  mcp: 'agents.mcpTemplates',
  built_in: 'agents.builtInTemplates',
} as const satisfies Record<ToolType, string>;
