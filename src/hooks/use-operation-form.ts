import { type FormEvent, useState } from 'react';

import type { Workspace } from '@/lib/workspace';
import type { OperationProblem, OperationResult } from '@/lib/workspace-operations';
import { runOperation, useWorkspace } from '@/state/workspace-store';

interface OperationFormOptions {
  /** 只禁用保存、不在输入时提示的原因码，如尚未填写的必填字段。提交时仍会提示。 */
  quiet: (problem: OperationProblem) => boolean;
  /** 提交成功后调用，通常是关闭对话框。 */
  onDone: () => void;
}

export interface OperationForm {
  /** 要显示的原因码：提交失败的原因优先，否则是输入时试算得到的原因。 */
  problem: OperationProblem | null;
  /** 试算失败时禁用保存。 */
  canSubmit: boolean;
  submit: (event: FormEvent) => void;
  /** 用户修改了出错的字段后，清除提交失败的原因。 */
  clearSubmitProblem: () => void;
}

/**
 * 实体对话框的表单逻辑：工作区操作是纯函数，可以边输入边对当前工作区试算，立即提示重复标识等问题；
 * 提交时再对最新的工作区执行一次，失败时保留对话框并显示原因。
 */
export function useOperationForm(
  operation: (workspace: Workspace) => OperationResult,
  { quiet, onDone }: OperationFormOptions
): OperationForm {
  const workspace = useWorkspace();
  const [submitProblem, setSubmitProblem] = useState<OperationProblem | null>(null);

  const trial = operation(workspace);
  const liveProblem = 'problem' in trial && !quiet(trial.problem) ? trial.problem : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = runOperation(operation);
    if (problem) {
      setSubmitProblem(problem);
    } else {
      onDone();
    }
  }

  return {
    problem: submitProblem ?? liveProblem,
    canSubmit: !('problem' in trial),
    submit,
    clearSubmitProblem: () => setSubmitProblem(null),
  };
}
