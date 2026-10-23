import { useSyncExternalStore } from 'react';

import {
  type DeviceSettingsLoadProblem,
  type SaveProblem,
  browserStorage,
  loadDeviceSettings,
  saveDeviceSettings,
} from '@/lib/persistence';
import type { DeviceSettings } from '@/lib/workspace';

/*
 * 本机设置的内存状态，与工作区分开：不经过工作区操作，不进入导出文件，也不同步。
 * 界面通过 `useDeviceSettings()` 订阅，通过 `setDeviceSettings()` 修改；每次修改都写入本地存储。
 */

/** 本机设置的存储状态：启动时读取的问题，或最近一次写入的问题。写入成功后清空。 */
export type DeviceSettingsProblem = DeviceSettingsLoadProblem | SaveProblem;

interface State {
  settings: DeviceSettings;
  problem: DeviceSettingsProblem | null;
}

const initial = loadDeviceSettings(browserStorage);
let state: State = { settings: initial.settings, problem: initial.problem };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getState(): State {
  return state;
}

export function setDeviceSettings(settings: DeviceSettings): void {
  state = { settings, problem: saveDeviceSettings(browserStorage, settings) };
  listeners.forEach((listener) => listener());
}

export function useDeviceSettings(): DeviceSettings {
  return useSyncExternalStore(subscribe, getState).settings;
}

export function useDeviceSettingsProblem(): DeviceSettingsProblem | null {
  return useSyncExternalStore(subscribe, getState).problem;
}
