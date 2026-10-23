import { type SettingsProblem, browserStorage, loadDeviceSettings, saveDeviceSettings } from '@/lib/persistence';
import type { DeviceSettings } from '@/lib/workspace';
import { createStore } from '@/state/create-store';

/*
 * 本机设置的内存状态，与工作区分开：不经过工作区操作，不进入导出文件，也不同步。
 * 界面通过 `useDeviceSettings()` 订阅，通过 `setDeviceSettings()` 修改；每次修改都写入本地存储。
 */

interface State {
  settings: DeviceSettings;
  /** 启动时读取的问题，或最近一次写入的问题。写入成功后清空。 */
  problem: SettingsProblem | null;
}

const store = createStore<State>(loadDeviceSettings(browserStorage));

export function setDeviceSettings(settings: DeviceSettings): void {
  store.set({ settings, problem: saveDeviceSettings(browserStorage, settings) });
}

export function useDeviceSettings(): DeviceSettings {
  return store.use((state) => state.settings);
}

export function useDeviceSettingsProblem(): SettingsProblem | null {
  return store.use((state) => state.problem);
}
