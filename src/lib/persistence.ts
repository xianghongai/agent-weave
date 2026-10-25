import { EMPTY_GIST_SETTINGS, type GistSettings } from '@/lib/gist';
import { type Language, isLanguage } from '@/lib/language';
import { createPresetWorkspace } from '@/lib/presets';
import { type DeviceSettings, EMPTY_DEVICE_SETTINGS, OPERATING_SYSTEMS, type Workspace } from '@/lib/workspace';
import type { ImportFailure, ImportProblem } from '@/lib/workspace-file';
import { parseWorkspace } from '@/lib/workspace-validation';

/*
 * 持久化：应用状态在浏览器本地存储中只占一个键，读写由界面层的 store 完成。
 * 这里只放读取时用到的纯函数：校验上次保存的内容，无效的部分回退到默认值，并给出原因码供界面提示。
 */

/** 应用状态在本地存储中的键。 */
export const STORAGE_KEY = 'agent-weave';

export const THEMES = ['dark', 'light'] as const;
export type Theme = (typeof THEMES)[number];

/** 页面默认深色，与 `index.html` 中 `<html class="dark">` 一致。 */
export const DEFAULT_THEME: Theme = 'dark';

/**
 * 写入本地存储的应用状态。本机设置、Gist 设置、主题和界面语言只存在本机：
 * 与工作区存放在同一个键中，但导出文件和 Gist 推送只序列化工作区。
 */
export interface PersistedState {
  workspace: Workspace;
  deviceSettings: DeviceSettings;
  gistSettings: GistSettings;
  theme: Theme;
  /** 手动选择的界面语言；`null` 表示跟随浏览器。 */
  language: Language | null;
}

/**
 * 本地存储整体不可用的原因：
 * - `readFailed`：存储不可用或读取时出错，如浏览器禁用了站点数据；
 * - `writeFailed`：存储不可用或写入时出错，如隐私模式、配额已满。
 */
export type StorageProblem = 'readFailed' | 'writeFailed';

/** 本地存储相关的全部原因码。工作区的原因与导入文件走同一套解析、迁移和校验，见 `ImportProblem`。 */
export type PersistenceProblem = StorageProblem | ImportProblem;

/**
 * 本机设置或 Gist 设置回退的原因：
 * - `parseFailed`：保存的内容不是合法的 JSON，整份状态都读不出来；
 * - `invalidStructure`：该设置缺失，或某个属性的类型、取值不对。
 */
export type SettingsProblem = 'parseFailed' | 'invalidStructure';

/**
 * 读取时已回退到默认值的部分，各自给出原因码；没有回退的部分为 `null`。工作区回退到预设，设置回退到空的设置。
 * 工作区的原因能定位到条目时带上条目 ID，见 `ImportFailure`。
 */
export interface RestoreFallback {
  workspace: ImportFailure | null;
  deviceSettings: SettingsProblem | null;
  gistSettings: SettingsProblem | null;
}

/** 保存的内容无法解析为 JSON 时的回退：每一部分都使用了默认值。数据仍在本地存储中，直到下一次修改覆盖它。 */
export function parseFailedFallback(): RestoreFallback {
  return { workspace: { problem: 'parseFailed' }, deviceSettings: 'parseFailed', gistSettings: 'parseFailed' };
}

/**
 * 校验从本地存储读到的应用状态，总是返回一份可用的状态。
 * 没有本地数据（首次访问）时返回默认值且不提示；某一部分无效时只回退这一部分，其余照常恢复。
 * 主题、界面语言无效时静默回退到默认主题、跟随浏览器。
 * `interfaceLanguage` 由界面层传入，按手动选择（`null` 表示跟随浏览器）给出界面语言，
 * 回退时的预设用这种语言，与 i18n 初始化时用的是同一个函数，两边的语言一致。
 */
export function restorePersistedState(
  persisted: unknown,
  interfaceLanguage: (chosen: Language | null) => Language
): {
  state: PersistedState;
  fallback: RestoreFallback | null;
} {
  if (persisted === undefined || persisted === null) {
    return { state: defaultPersistedState(interfaceLanguage(null)), fallback: null };
  }
  const value = isRecord(persisted) ? persisted : {};

  const workspaceResult = parseWorkspace(value.workspace);
  const deviceSettings = isRecord(value.deviceSettings) ? parseDeviceSettings(value.deviceSettings) : null;
  const gistSettings = isRecord(value.gistSettings) ? parseGistSettings(value.gistSettings) : null;
  const theme = THEMES.find((candidate) => candidate === value.theme) ?? DEFAULT_THEME;
  const language = isLanguage(value.language) ? value.language : null;

  const fallback: RestoreFallback = {
    workspace: 'workspace' in workspaceResult ? null : workspaceResult,
    deviceSettings: deviceSettings === null ? 'invalidStructure' : null,
    gistSettings: gistSettings === null ? 'invalidStructure' : null,
  };
  return {
    state: {
      workspace:
        'workspace' in workspaceResult ? workspaceResult.workspace : createPresetWorkspace(interfaceLanguage(language)),
      deviceSettings: deviceSettings ?? EMPTY_DEVICE_SETTINGS,
      gistSettings: gistSettings ?? EMPTY_GIST_SETTINGS,
      theme,
      language,
    },
    fallback: fallback.workspace || fallback.deviceSettings || fallback.gistSettings ? fallback : null,
  };
}

/** 首次访问时的应用状态：`language`（跟随浏览器时的界面语言）的预设工作区、空的设置、默认主题，界面语言跟随浏览器。 */
export function defaultPersistedState(language: Language): PersistedState {
  return {
    workspace: createPresetWorkspace(language),
    deviceSettings: EMPTY_DEVICE_SETTINGS,
    gistSettings: EMPTY_GIST_SETTINGS,
    theme: DEFAULT_THEME,
    language: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDeviceSettings(value: Record<string, unknown>): DeviceSettings | null {
  const { os, user_names: userNames } = value;
  // `undefined` 表示取值无效；`null` 表示未选择操作系统，是合法的。
  const parsedOs = os === null ? null : OPERATING_SYSTEMS.find((candidate) => candidate === os);
  if (parsedOs === undefined || !isRecord(userNames)) {
    return null;
  }
  // 每种操作系统都要有一个字符串用户名；只保留已知属性，丢弃未知属性。
  const parsedNames = { ...EMPTY_DEVICE_SETTINGS.user_names };
  for (const system of OPERATING_SYSTEMS) {
    const userName = userNames[system];
    if (typeof userName !== 'string') {
      return null;
    }
    parsedNames[system] = userName;
  }
  return { os: parsedOs, user_names: parsedNames };
}

function parseGistSettings(value: Record<string, unknown>): GistSettings | null {
  const { token, gist_id } = value;
  // 只保留已知属性，丢弃未知属性。
  return typeof token === 'string' && typeof gist_id === 'string' ? { token, gist_id } : null;
}
