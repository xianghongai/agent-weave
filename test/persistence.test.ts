import { describe, expect, it } from 'vitest';

import { type PersistedState, restorePersistedState } from '@/lib/persistence';
import { createPresetWorkspace } from '@/lib/presets';
import { parseWorkspace } from '@/lib/workspace-validation';

import { corrupt, edited } from './fixtures/workspace';

/** 与 `corrupt` 相同，但返回解析后的值：本地存储中的工作区由 `persist` 整体解析后才交给校验。 */
function corruptValue(path: (string | number)[], value: unknown): unknown {
  return JSON.parse(corrupt(path, value));
}

/** 上次保存的应用状态：每一部分都有值，且与默认值不同。 */
function saved(): PersistedState {
  return {
    workspace: edited(),
    deviceSettings: { os: 'macos', user_names: { linux: 'alice', macos: 'alice.m', windows: '' } },
    gistSettings: { token: 'test-token', gist_id: 'aa5a315d61ae9438b18d' },
    theme: 'light',
  };
}

describe('持久化：恢复上次保存的状态', () => {
  it('数据有效时原样恢复，不提示', () => {
    expect(restorePersistedState(saved())).toEqual({ state: saved(), fallback: null });
  });

  it('首次访问时没有本地数据，使用预设、空的设置和深色主题，不提示', () => {
    expect(restorePersistedState(undefined)).toEqual({
      state: {
        workspace: createPresetWorkspace(),
        deviceSettings: { os: null, user_names: { linux: '', macos: '', windows: '' } },
        gistSettings: { token: '', gist_id: '' },
        theme: 'dark',
      },
      fallback: null,
    });
  });

  it.each([
    ['缺少规则列表', corruptValue(['rules'], undefined)],
    ['结构版本不是整数', corruptValue(['schema_version'], '1')],
    ['规则的决策不在取值范围内', corruptValue(['rules', 0, 'decision'], 'maybe')],
  ])('工作区结构无效（%s）时只回退工作区到预设，设置照常恢复', (_, workspace) => {
    expect(restorePersistedState({ ...saved(), workspace })).toEqual({
      state: { ...saved(), workspace: createPresetWorkspace() },
      fallback: { workspace: 'invalidStructure', deviceSettings: false, gistSettings: false },
    });
  });

  it('工作区来自更新的版本时回退到预设，并给出原因码', () => {
    expect(restorePersistedState({ ...saved(), workspace: corruptValue(['schema_version'], 2) })).toEqual({
      state: { ...saved(), workspace: createPresetWorkspace() },
      fallback: { workspace: 'newerVersion', deviceSettings: false, gistSettings: false },
    });
  });

  it.each([
    ['操作系统未知', { os: 'beos', user_names: { linux: 'alice', macos: '', windows: '' } }],
    ['某个系统的用户名不是字符串', { os: 'linux', user_names: { linux: 'alice', macos: 1, windows: '' } }],
    ['缺少某个系统的用户名', { os: 'linux', user_names: { linux: 'alice', macos: '' } }],
    ['用户名不是对象', { os: 'linux', user_names: 'alice' }],
    ['只有一个用户名的旧结构', { os: 'linux', user_name: 'alice' }],
    ['不是对象', []],
    ['缺失', undefined],
  ])('本机设置无效（%s）时回退到空的本机设置，其余照常恢复', (_, deviceSettings) => {
    expect(restorePersistedState({ ...saved(), deviceSettings })).toEqual({
      state: { ...saved(), deviceSettings: { os: null, user_names: { linux: '', macos: '', windows: '' } } },
      fallback: { workspace: null, deviceSettings: true, gistSettings: false },
    });
  });

  it.each([
    ['属性不是字符串', { token: 'test-token', gist_id: 42 }],
    ['不是对象', 'test-token'],
  ])('Gist 设置无效（%s）时回退到空的 Gist 设置，其余照常恢复', (_, gistSettings) => {
    expect(restorePersistedState({ ...saved(), gistSettings })).toEqual({
      state: { ...saved(), gistSettings: { token: '', gist_id: '' } },
      fallback: { workspace: null, deviceSettings: false, gistSettings: true },
    });
  });

  it('未选择操作系统是合法的本机设置', () => {
    const deviceSettings = { os: null, user_names: { linux: 'alice', macos: '', windows: '' } };
    expect(restorePersistedState({ ...saved(), deviceSettings })).toEqual({
      state: { ...saved(), deviceSettings },
      fallback: null,
    });
  });

  it('设置中不认识的属性被丢弃', () => {
    const state = restorePersistedState({
      ...saved(),
      deviceSettings: {
        ...saved().deviceSettings,
        user_names: { ...saved().deviceSettings.user_names, beos: 'x' },
        extra: 'x',
      },
      gistSettings: { ...saved().gistSettings, extra: 'x' },
    });
    expect(state).toEqual({ state: saved(), fallback: null });
  });

  it('主题无效时静默回退到深色', () => {
    expect(restorePersistedState({ ...saved(), theme: 'sepia' })).toEqual({
      state: { ...saved(), theme: 'dark' },
      fallback: null,
    });
  });

  it('整体不是对象时，每一部分都回退', () => {
    expect(restorePersistedState('hello')).toEqual({
      state: restorePersistedState(undefined).state,
      fallback: { workspace: 'invalidStructure', deviceSettings: true, gistSettings: true },
    });
  });
});

describe('工作区校验', () => {
  it('预设工作区通过校验', () => {
    expect(parseWorkspace(createPresetWorkspace())).toEqual({ workspace: createPresetWorkspace() });
  });
});
