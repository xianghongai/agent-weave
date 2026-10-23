import type { GistSettings } from '@/lib/gist';
import { type SettingsProblem, browserStorage, loadGistSettings, saveGistSettings } from '@/lib/persistence';
import { createStore } from '@/state/create-store';

/*
 * Gist 设置（Token、Gist ID）的内存状态，与工作区分开：只保存在本机，不进入导出文件，也不同步。
 * 界面通过 `useGistSettings()` 订阅，通过 `setGistSettings()` 修改；每次修改都写入本地存储。
 */

interface State {
  settings: GistSettings;
  /** 启动时读取的问题，或最近一次写入的问题。写入成功后清空。 */
  problem: SettingsProblem | null;
}

const store = createStore<State>(loadGistSettings(browserStorage));

export function getGistSettings(): GistSettings {
  return store.get().settings;
}

export function setGistSettings(settings: GistSettings): void {
  store.set({ settings, problem: saveGistSettings(browserStorage, settings) });
}

export function useGistSettings(): GistSettings {
  return store.use((state) => state.settings);
}

export function useGistSettingsProblem(): SettingsProblem | null {
  return store.use((state) => state.problem);
}
