import { create, type StateCreator } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { RestoreFallback, StorageProblem } from '@/lib/persistence';
import { devtoolsInDev } from '@/state/devtools';

/*
 * 非持久化的全局界面状态：多个页面或组件共用、刷新后重置的状态。
 * 不挂 `persist`：这里的修改不会触发本地存储写入，记录写入错误也不会再次引起写入。
 * 只在一个页面内使用的状态（Tab、筛选条件、表单）用组件自己的 `useState`。
 */

/** 本地存储的状态，供存储提示横幅和同步页显示。 */
export interface StorageSlice {
  /** 启动时本地数据无效、已回退到默认值的部分。没有回退时为 `null`。 */
  fallback: RestoreFallback | null;
  /** 当前修改无法保存的原因：启动时就读不了存储，或最近一次写入失败。写入成功后清空。 */
  unsaved: StorageProblem | null;
  setFallback: (fallback: RestoreFallback | null) => void;
  /** 用户看过提示后关闭某一部分的回退提示；设置被重新填写时也清除对应的提示。 */
  dismissFallback: (part: keyof RestoreFallback) => void;
  setUnsaved: (unsaved: StorageProblem | null) => void;
}

/** 输出页等页面共用的当前选中 Agent。为 `null` 或所选 Agent 已被删除时，页面显示第一个 Agent。 */
export interface AgentSelectionSlice {
  selectedAgentId: string | null;
  selectAgent: (id: string) => void;
}

export type UiState = StorageSlice & AgentSelectionSlice;

type UiSliceCreator<Slice> = StateCreator<UiState, [['zustand/devtools', never], ['zustand/immer', never]], [], Slice>;

const createStorageSlice: UiSliceCreator<StorageSlice> = (set, get) => ({
  fallback: null,
  unsaved: null,
  setFallback: (fallback) =>
    set(
      (state) => {
        state.fallback = fallback;
      },
      undefined,
      'storage/setFallback'
    ),
  dismissFallback: (part) => {
    if (!get().fallback?.[part]) {
      return;
    }
    set(
      (state) => {
        if (!state.fallback) {
          return;
        }
        if (part === 'workspace') {
          state.fallback.workspace = null;
        } else {
          state.fallback[part] = false;
        }
      },
      undefined,
      'storage/dismissFallback'
    );
  },
  setUnsaved: (unsaved) => {
    // 每次写入本地存储都会调用；状态没有变化时不通知订阅者，也不在 DevTools 中留下记录。
    if (get().unsaved === unsaved) {
      return;
    }
    set(
      (state) => {
        state.unsaved = unsaved;
      },
      undefined,
      'storage/setUnsaved'
    );
  },
});

const createAgentSelectionSlice: UiSliceCreator<AgentSelectionSlice> = (set) => ({
  selectedAgentId: null,
  selectAgent: (id) =>
    set(
      (state) => {
        state.selectedAgentId = id;
      },
      undefined,
      'agentSelection/selectAgent'
    ),
});

export const useUiStore = create<UiState>()(
  devtoolsInDev(
    immer((...args) => ({
      ...createStorageSlice(...args),
      ...createAgentSelectionSlice(...args),
    })),
    { name: 'agent-weave/ui' }
  )
);
