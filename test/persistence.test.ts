import { describe, expect, it } from 'vitest';

import { type PersistedState, parseFailedFallback, restorePersistedState } from '@/lib/persistence';
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
    language: 'en',
  };
}

/** 浏览器语言偏好。预设语言由它和保存的 `language` 决定，与界面语言一致。 */
const PREFERRED = ['zh-CN'];

describe('持久化：恢复上次保存的状态', () => {
  it('数据有效时原样恢复，不提示', () => {
    expect(restorePersistedState(saved(), PREFERRED)).toEqual({ state: saved(), fallback: null });
  });

  it('首次访问时没有本地数据，使用预设、空的设置和深色主题，界面语言跟随浏览器，不提示', () => {
    expect(restorePersistedState(undefined, PREFERRED)).toEqual({
      state: {
        workspace: createPresetWorkspace('zh-CN'),
        deviceSettings: { os: null, user_names: { linux: '', macos: '', windows: '' } },
        gistSettings: { token: '', gist_id: '' },
        theme: 'dark',
        language: null,
      },
      fallback: null,
    });
  });

  it.each([
    ['缺少规则列表', corruptValue(['rules'], undefined)],
    ['结构版本不是整数', corruptValue(['schema_version'], '1')],
    ['规则的决策不在取值范围内', corruptValue(['rules', 0, 'decision'], 'maybe')],
  ])('工作区结构无效（%s）时只回退工作区到预设，设置照常恢复', (_, workspace) => {
    expect(restorePersistedState({ ...saved(), workspace }, PREFERRED)).toEqual({
      state: { ...saved(), workspace: createPresetWorkspace('en') },
      fallback: { workspace: { problem: 'invalidStructure' }, deviceSettings: null, gistSettings: null },
    });
  });

  it('工作区来自更新的版本时回退到预设，并给出原因码', () => {
    expect(restorePersistedState({ ...saved(), workspace: corruptValue(['schema_version'], 2) }, PREFERRED)).toEqual({
      state: { ...saved(), workspace: createPresetWorkspace('en') },
      fallback: { workspace: { problem: 'newerVersion' }, deviceSettings: null, gistSettings: null },
    });
  });

  it('工作区中有规则指向不存在的工具时回退到预设，并指出是哪条规则', () => {
    const workspace = corruptValue(['rules', 1, 'tool', 'id'], 'builtin-gone');
    expect(restorePersistedState({ ...saved(), workspace }, PREFERRED)).toEqual({
      state: { ...saved(), workspace: createPresetWorkspace('en') },
      fallback: {
        workspace: { problem: 'danglingReference', entryId: 'rule-2' },
        deviceSettings: null,
        gistSettings: null,
      },
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
    expect(restorePersistedState({ ...saved(), deviceSettings }, PREFERRED)).toEqual({
      state: { ...saved(), deviceSettings: { os: null, user_names: { linux: '', macos: '', windows: '' } } },
      fallback: { workspace: null, deviceSettings: 'invalidStructure', gistSettings: null },
    });
  });

  it.each([
    ['属性不是字符串', { token: 'test-token', gist_id: 42 }],
    ['不是对象', 'test-token'],
  ])('Gist 设置无效（%s）时回退到空的 Gist 设置，其余照常恢复', (_, gistSettings) => {
    expect(restorePersistedState({ ...saved(), gistSettings }, PREFERRED)).toEqual({
      state: { ...saved(), gistSettings: { token: '', gist_id: '' } },
      fallback: { workspace: null, deviceSettings: null, gistSettings: 'invalidStructure' },
    });
  });

  it('未选择操作系统是合法的本机设置', () => {
    const deviceSettings = { os: null, user_names: { linux: 'alice', macos: '', windows: '' } };
    expect(restorePersistedState({ ...saved(), deviceSettings }, PREFERRED)).toEqual({
      state: { ...saved(), deviceSettings },
      fallback: null,
    });
  });

  it('设置中不认识的属性被丢弃', () => {
    const state = restorePersistedState(
      {
        ...saved(),
        deviceSettings: {
          ...saved().deviceSettings,
          user_names: { ...saved().deviceSettings.user_names, beos: 'x' },
          extra: 'x',
        },
        gistSettings: { ...saved().gistSettings, extra: 'x' },
      },
      PREFERRED
    );
    expect(state).toEqual({ state: saved(), fallback: null });
  });

  it('主题无效时静默回退到深色', () => {
    expect(restorePersistedState({ ...saved(), theme: 'sepia' }, PREFERRED)).toEqual({
      state: { ...saved(), theme: 'dark' },
      fallback: null,
    });
  });

  it.each([
    ['不是支持的语言', 'ja'],
    ['不是字符串', 1],
    ['缺失', undefined],
  ])('界面语言无效（%s）时静默回到跟随浏览器，不提示', (_, language) => {
    expect(restorePersistedState({ ...saved(), language }, PREFERRED)).toEqual({
      state: { ...saved(), language: null },
      fallback: null,
    });
  });

  it('手动选择的界面语言与浏览器语言相同时照样恢复', () => {
    expect(restorePersistedState({ ...saved(), language: 'zh-CN' }, PREFERRED)).toEqual({
      state: { ...saved(), language: 'zh-CN' },
      fallback: null,
    });
  });

  it('整体不是对象时，每一部分都回退', () => {
    expect(restorePersistedState('hello', PREFERRED)).toEqual({
      state: restorePersistedState(undefined, PREFERRED).state,
      fallback: {
        workspace: { problem: 'invalidStructure' },
        deviceSettings: 'invalidStructure',
        gistSettings: 'invalidStructure',
      },
    });
  });

  it('保存的内容无法解析时，每一部分都已回退，都以 parseFailed 提示', () => {
    expect(parseFailedFallback()).toEqual({
      workspace: { problem: 'parseFailed' },
      deviceSettings: 'parseFailed',
      gistSettings: 'parseFailed',
    });
  });
});

describe('持久化：预设的语言与界面语言一致', () => {
  /** 用已知条目的文字判断取的是哪种语言的预设：版本控制标签的名称。 */
  function vcsTagName(state: PersistedState): string | undefined {
    return state.workspace.tags.find((tag) => tag.id === 'preset-tag-vcs')?.name;
  }

  it.each([
    [['zh-TW', 'en'], '版本控制'],
    [['ja', 'en-US'], 'Version control'],
    [['ja'], 'Version control'],
    [[], 'Version control'],
  ])('首次访问时，预设的语言由浏览器偏好 %j 决定', (preferred, name) => {
    const { state } = restorePersistedState(undefined, preferred);
    expect(vcsTagName(state)).toBe(name);
    expect(state.language).toBeNull();
  });

  it('工作区回退时，预设的语言先取保存的界面语言', () => {
    const persisted = { ...saved(), workspace: corruptValue(['rules'], undefined), language: 'zh-CN' };
    expect(vcsTagName(restorePersistedState(persisted, ['en-US']).state)).toBe('版本控制');
  });

  it('工作区回退且没有保存界面语言时，预设的语言取浏览器偏好', () => {
    const persisted = { ...saved(), workspace: corruptValue(['rules'], undefined), language: null };
    expect(vcsTagName(restorePersistedState(persisted, ['en-GB']).state)).toBe('Version control');
    expect(vcsTagName(restorePersistedState(persisted, ['zh']).state)).toBe('版本控制');
  });
});

describe('工作区校验', () => {
  it('预设工作区通过校验', () => {
    expect(parseWorkspace(createPresetWorkspace('zh-CN'))).toEqual({ workspace: createPresetWorkspace('zh-CN') });
  });
});
