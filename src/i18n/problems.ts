import type { TFunction } from 'i18next';

import type { OperationProblem } from '@/lib/workspace-operations';

/** 把工作区操作的原因码翻译成界面文案。 */
export function operationProblemMessage(t: TFunction, problem: OperationProblem): string {
  return t(`problems.operation.${problem}`);
}
