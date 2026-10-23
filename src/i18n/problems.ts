import type { TFunction } from 'i18next';

import type { SkipReason } from '@/lib/generate';
import type { PersistenceProblem } from '@/lib/persistence';
import type { Rule, ToolType } from '@/lib/workspace';
import type { OperationProblem } from '@/lib/workspace-operations';

/** 把工作区操作的原因码翻译成界面文案。 */
export function operationProblemMessage(t: TFunction, problem: OperationProblem): string {
  return t(`problems.operation.${problem}`);
}

/** 把本地存储读写的原因码翻译成界面文案。 */
export function persistenceProblemMessage(t: TFunction, problem: PersistenceProblem): string {
  return t(`problems.persistence.${problem}`);
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
