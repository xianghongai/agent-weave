import { useSyncExternalStore } from 'react';

import { createPresetWorkspace } from '@/lib/presets';
import type { Workspace } from '@/lib/workspace';
import type { OperationProblem, OperationResult } from '@/lib/workspace-operations';

/*
 * 当前工作区的内存状态。界面通过 `useWorkspace()` 订阅，通过 `runOperation()` 修改。
 * 所有修改都经过 `src/lib/workspace-operations.ts` 中的纯函数，这里只负责保存结果并通知订阅者。
 */

let current: Workspace = createPresetWorkspace();
const listeners = new Set<() => void>();

export function getWorkspace(): Workspace {
  return current;
}

function setWorkspace(next: Workspace): void {
  current = next;
  listeners.forEach((listener) => listener());
}

export function subscribeWorkspace(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 对当前工作区执行一个工作区操作。
 * 成功时替换当前工作区并返回 `null`；失败时工作区不变，返回原因码供界面翻译。
 */
export function runOperation(operation: (workspace: Workspace) => OperationResult): OperationProblem | null {
  const result = operation(current);
  if ('problem' in result) {
    return result.problem;
  }
  setWorkspace(result.workspace);
  return null;
}

export function useWorkspace(): Workspace {
  return useSyncExternalStore(subscribeWorkspace, getWorkspace);
}
