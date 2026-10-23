import { useSyncExternalStore } from 'react';

import {
  type LoadProblem,
  type PersistenceProblem,
  browserStorage,
  loadWorkspace,
  saveWorkspace,
} from '@/lib/persistence';
import type { Workspace } from '@/lib/workspace';
import type { OperationProblem, OperationResult } from '@/lib/workspace-operations';

/*
 * 当前工作区的内存状态。界面通过 `useWorkspace()` 订阅，通过 `runOperation()` 修改。
 * 所有修改都经过 `src/lib/workspace-operations.ts` 中的纯函数，这里只负责保存结果、写入本地存储并通知订阅者。
 * 启动时从本地存储读取；首次访问或本地数据无效时使用预设。
 */

/** 本地存储的状态，供界面显示提示。 */
export interface StorageStatus {
  /** 启动时本地数据无效、已回退到预设的原因；用户关闭提示后清空。 */
  fallback: Exclude<LoadProblem, 'readFailed'> | null;
  /** 当前修改无法保存的原因：启动时就读不了存储，或最近一次写入失败。写入成功后清空。 */
  unsaved: Extract<PersistenceProblem, 'readFailed' | 'writeFailed'> | null;
}

const initial = loadWorkspace(browserStorage);

let current: Workspace = initial.workspace;
let status: StorageStatus = {
  fallback: initial.problem === 'readFailed' ? null : initial.problem,
  unsaved: initial.problem === 'readFailed' ? 'readFailed' : null,
};
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function getWorkspace(): Workspace {
  return current;
}

function setWorkspace(next: Workspace): void {
  current = next;
  const problem = saveWorkspace(browserStorage, next);
  if (problem !== status.unsaved) {
    status = { ...status, unsaved: problem };
  }
  notify();
}

export function subscribeWorkspace(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 对当前工作区执行一个工作区操作。
 * 成功时替换当前工作区、写入本地存储并返回 `null`；失败时工作区不变，返回原因码供界面翻译。
 * 写入本地存储失败不算操作失败，结果通过 `useStorageStatus()` 反映。
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

function getStorageStatus(): StorageStatus {
  return status;
}

export function useStorageStatus(): StorageStatus {
  return useSyncExternalStore(subscribeWorkspace, getStorageStatus);
}

/** 用户看过“已回退到预设”的提示后关闭它。 */
export function dismissStorageFallback(): void {
  if (status.fallback !== null) {
    status = { ...status, fallback: null };
    notify();
  }
}
