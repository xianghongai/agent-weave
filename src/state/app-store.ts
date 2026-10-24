import { create, type StateCreator } from 'zustand';
import { createJSONStorage, type PersistStorage, persist, type StateStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { GistSettings } from '@/lib/gist';
import {
  type PersistedState,
  STORAGE_KEY,
  type Theme,
  defaultPersistedState,
  restorePersistedState,
} from '@/lib/persistence';
import type { DeviceSettings, Workspace } from '@/lib/workspace';
import type { OperationProblem, OperationResult } from '@/lib/workspace-operations';
import { devtoolsInDev } from '@/state/devtools';
import { useUiStore } from '@/state/ui-store';

/*
 * 持久化的应用状态：工作区、本机设置、Gist 设置、主题，写入本地存储的同一个键。
 * 启动时从本地存储恢复；首次访问或数据无效时使用默认值，回退原因写进界面 store。
 * 本地存储的读写错误不抛给 action，而是记录在界面 store 中，由存储提示横幅显示。
 */

export interface WorkspaceSlice {
  workspace: Workspace;
  /**
   * 对当前工作区执行一个工作区操作（`src/lib/workspace-operations.ts`）。
   * 成功时替换当前工作区并返回 `null`；失败时工作区不变，返回原因码供界面翻译。
   * 写入本地存储失败不算操作失败，结果记录在界面 store 的 `unsaved` 中。
   */
  applyOperation: (operation: (workspace: Workspace) => OperationResult) => OperationProblem | null;
  /** 用一份完整的工作区整体替换当前工作区，如导入文件、拉取 Gist、合并预设。 */
  replaceWorkspace: (workspace: Workspace) => void;
}

export interface DeviceSettingsSlice {
  deviceSettings: DeviceSettings;
  setDeviceSettings: (settings: DeviceSettings) => void;
}

export interface GistSettingsSlice {
  gistSettings: GistSettings;
  setGistSettings: (settings: GistSettings) => void;
}

export interface ThemeSlice {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export type AppState = WorkspaceSlice & DeviceSettingsSlice & GistSettingsSlice & ThemeSlice;

type AppSliceCreator<Slice> = StateCreator<
  AppState,
  [['zustand/devtools', never], ['zustand/persist', unknown], ['zustand/immer', never]],
  [],
  Slice
>;

const initial = defaultPersistedState();

const createWorkspaceSlice: AppSliceCreator<WorkspaceSlice> = (set, get) => ({
  workspace: initial.workspace,
  applyOperation: (operation) => {
    const result = operation(get().workspace);
    if ('problem' in result) {
      return result.problem;
    }
    set(
      (state) => {
        state.workspace = result.workspace;
      },
      undefined,
      'workspace/applyOperation'
    );
    return null;
  },
  replaceWorkspace: (workspace) =>
    set(
      (state) => {
        state.workspace = workspace;
      },
      undefined,
      'workspace/replaceWorkspace'
    ),
});

const createDeviceSettingsSlice: AppSliceCreator<DeviceSettingsSlice> = (set) => ({
  deviceSettings: initial.deviceSettings,
  setDeviceSettings: (settings) => {
    set(
      (state) => {
        state.deviceSettings = settings;
      },
      undefined,
      'deviceSettings/setDeviceSettings'
    );
    useUiStore.getState().dismissFallback('deviceSettings');
  },
});

const createGistSettingsSlice: AppSliceCreator<GistSettingsSlice> = (set) => ({
  gistSettings: initial.gistSettings,
  setGistSettings: (settings) => {
    set(
      (state) => {
        // 只保留已知属性，避免调用方传入的对象把其他属性带进本地存储。
        state.gistSettings = { token: settings.token, gist_id: settings.gist_id };
      },
      undefined,
      'gistSettings/setGistSettings'
    );
    useUiStore.getState().dismissFallback('gistSettings');
  },
});

const createThemeSlice: AppSliceCreator<ThemeSlice> = (set) => ({
  theme: initial.theme,
  setTheme: (theme) =>
    set(
      (state) => {
        state.theme = theme;
      },
      undefined,
      'theme/setTheme'
    ),
});

/**
 * 浏览器的 `localStorage`。每次调用时才访问它：
 * 有的浏览器在禁用站点数据时，连读取 `localStorage` 属性都会抛异常，这样异常会落在读写各自的错误处理里，
 * 而不是让 `createJSONStorage` 在创建时就放弃持久化。
 */
const browserStorage: StateStorage = {
  getItem: (name) => globalThis.localStorage.getItem(name),
  setItem: (name, value) => globalThis.localStorage.setItem(name, value),
  removeItem: (name) => globalThis.localStorage.removeItem(name),
};

/**
 * 在 `createJSONStorage` 外再包一层，捕获写入失败：写入失败时记下 `writeFailed`，写入成功后清空。
 * 读取和 JSON 解析失败不在这里处理，由 `onRehydrateStorage` 的 error 回调处理。
 */
function reportingStorage(storage: PersistStorage<PersistedState>): PersistStorage<PersistedState> {
  return {
    getItem: (name) => storage.getItem(name),
    setItem: (name, value) => {
      try {
        void storage.setItem(name, value);
      } catch {
        useUiStore.getState().setUnsaved('writeFailed');
        return;
      }
      useUiStore.getState().setUnsaved(null);
    },
    removeItem: (name) => storage.removeItem(name),
  };
}

export const useAppStore = create<AppState>()(
  devtoolsInDev(
    persist(
      immer((...args) => ({
        ...createWorkspaceSlice(...args),
        ...createDeviceSettingsSlice(...args),
        ...createGistSettingsSlice(...args),
        ...createThemeSlice(...args),
      })),
      {
        name: STORAGE_KEY,
        storage: reportingStorage(createJSONStorage<PersistedState>(() => browserStorage)!),
        // action 不写入本地存储。
        partialize: ({ workspace, deviceSettings, gistSettings, theme }): PersistedState => ({
          workspace,
          deviceSettings,
          gistSettings,
          theme,
        }),
        // 不设 `version`、不写 `migrate`：工作区的结构版本由 `restorePersistedState` 中的工作区校验与迁移负责。
        merge: (persisted, current) => {
          const { state, fallback } = restorePersistedState(persisted);
          useUiStore.getState().setFallback(fallback);
          return { ...current, ...state };
        },
        onRehydrateStorage: () => (_state, error) => {
          if (error === undefined) {
            return;
          }
          // 内容无法解析时数据还在，下一次修改会覆盖它，与工作区无效同样提示；其余是存储本身读不了。
          if (error instanceof SyntaxError) {
            useUiStore.getState().setFallback({ workspace: 'parseFailed', deviceSettings: false, gistSettings: false });
          } else {
            useUiStore.getState().setUnsaved('readFailed');
          }
        },
      }
    ),
    { name: 'agent-weave/app' }
  )
);
