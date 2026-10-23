import { EMPTY_GIST_SETTINGS, type GistSettings } from '@/lib/gist';
import { createPresetWorkspace } from '@/lib/presets';
import { type DeviceSettings, EMPTY_DEVICE_SETTINGS, OPERATING_SYSTEMS, type Workspace } from '@/lib/workspace';
import { type ImportProblem, importWorkspace } from '@/lib/workspace-file';

/*
 * 持久化：在浏览器本地存储中读写工作区、本机设置和 Gist 设置，三者分键存储。
 * 读、写、解析失败都返回原因码，不抛异常，由界面层翻译成提示。
 * 存储通过参数注入，测试时使用内存中的替身。
 */

/** `localStorage` 中本模块用到的部分。 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 三类数据各用独立的键。本机设置和 Gist 设置只存在本机，不进入工作区。 */
export const STORAGE_KEYS = {
  workspace: 'agent-weave:workspace',
  deviceSettings: 'agent-weave:device-settings',
  gistSettings: 'agent-weave:gist-settings',
} as const;

/**
 * - `readFailed`：存储不可用或读取时出错，如浏览器禁用了站点数据；
 * - 其余见 `ImportProblem`：本地数据与导入文件走同一套解析、迁移和校验。
 */
export type LoadProblem = 'readFailed' | ImportProblem;

/** `writeFailed`：存储不可用或写入时出错，如隐私模式、配额已满。 */
export type SaveProblem = 'writeFailed';

export type PersistenceProblem = LoadProblem | SaveProblem;

/**
 * 读取本地保存的工作区，总是返回一份可用的工作区。
 * 没有本地数据（首次访问）时返回预设；本地数据无法读取或无效时也返回预设，同时给出原因码供界面提示。
 */
export function loadWorkspace(storage: KeyValueStorage): { workspace: Workspace; problem: LoadProblem | null } {
  let text: string | null;
  try {
    text = storage.getItem(STORAGE_KEYS.workspace);
  } catch {
    return { workspace: createPresetWorkspace(), problem: 'readFailed' };
  }
  if (text === null) {
    return { workspace: createPresetWorkspace(), problem: null };
  }
  const parsed = importWorkspace(text);
  if ('problem' in parsed) {
    return { workspace: createPresetWorkspace(), problem: parsed.problem };
  }
  return { workspace: parsed.workspace, problem: null };
}

/** 保存工作区。成功时返回 `null`。 */
export function saveWorkspace(storage: KeyValueStorage, workspace: Workspace): SaveProblem | null {
  try {
    storage.setItem(STORAGE_KEYS.workspace, JSON.stringify(workspace));
    return null;
  } catch {
    return 'writeFailed';
  }
}

/**
 * - `readFailed`：同 `LoadProblem`；
 * - `invalidStructure`：本地保存的本机设置无法解析，或不是有效的本机设置。
 */
export type DeviceSettingsLoadProblem = 'readFailed' | 'invalidStructure';

function parseDeviceSettings(text: string): DeviceSettings | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const { os, user_name: userName } = value as Record<string, unknown>;
  // `undefined` 表示取值无效；`null` 表示未选择操作系统，是合法的。
  const parsedOs = os === null ? null : OPERATING_SYSTEMS.find((candidate) => candidate === os);
  if (parsedOs === undefined || typeof userName !== 'string') {
    return null;
  }
  // 只保留已知属性，丢弃未知属性。
  return { os: parsedOs, user_name: userName };
}

/**
 * 读取本机设置，总是返回一份可用的设置。
 * 没有本地数据时返回空的设置；无法读取或无效时也返回空的设置，同时给出原因码。
 */
export function loadDeviceSettings(storage: KeyValueStorage): {
  settings: DeviceSettings;
  problem: DeviceSettingsLoadProblem | null;
} {
  let text: string | null;
  try {
    text = storage.getItem(STORAGE_KEYS.deviceSettings);
  } catch {
    return { settings: EMPTY_DEVICE_SETTINGS, problem: 'readFailed' };
  }
  if (text === null) {
    return { settings: EMPTY_DEVICE_SETTINGS, problem: null };
  }
  const settings = parseDeviceSettings(text);
  return settings ? { settings, problem: null } : { settings: EMPTY_DEVICE_SETTINGS, problem: 'invalidStructure' };
}

/** 保存本机设置。成功时返回 `null`。 */
export function saveDeviceSettings(storage: KeyValueStorage, settings: DeviceSettings): SaveProblem | null {
  try {
    storage.setItem(STORAGE_KEYS.deviceSettings, JSON.stringify(settings));
    return null;
  } catch {
    return 'writeFailed';
  }
}

/**
 * 读取 Gist 设置。没有数据、无法读取或无效时返回空的设置：
 * 这时用户重新填写即可，存储不可用的情况已由工作区的读取结果提示。
 */
export function loadGistSettings(storage: KeyValueStorage): GistSettings {
  let value: unknown;
  try {
    value = JSON.parse(storage.getItem(STORAGE_KEYS.gistSettings) ?? 'null');
  } catch {
    return { ...EMPTY_GIST_SETTINGS };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...EMPTY_GIST_SETTINGS };
  }
  const { token, gist_id } = value as Record<string, unknown>;
  return {
    token: typeof token === 'string' ? token : '',
    gist_id: typeof gist_id === 'string' ? gist_id : '',
  };
}

/** 保存 Gist 设置。成功时返回 `null`。 */
export function saveGistSettings(storage: KeyValueStorage, settings: GistSettings): SaveProblem | null {
  try {
    storage.setItem(STORAGE_KEYS.gistSettings, JSON.stringify({ token: settings.token, gist_id: settings.gist_id }));
    return null;
  } catch {
    return 'writeFailed';
  }
}

/**
 * 浏览器的 `localStorage`。每次调用时才访问它：
 * 有的浏览器在禁用站点数据时，连读取 `localStorage` 属性都会抛异常，这样异常也会落在上面的 `try` 里。
 */
export const browserStorage: KeyValueStorage = {
  getItem: (key) => globalThis.localStorage.getItem(key),
  setItem: (key, value) => globalThis.localStorage.setItem(key, value),
};
