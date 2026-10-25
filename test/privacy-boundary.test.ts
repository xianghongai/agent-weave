import { describe, expect, it } from 'vitest';

import { type GistConnection, pushWorkspace } from '@/lib/gist';
import type { PersistedState } from '@/lib/persistence';
import type { Workspace } from '@/lib/workspace';
import { exportWorkspace } from '@/lib/workspace-file';

import { edited } from './fixtures/workspace';

/*
 * 本地存储只有一个键，工作区与 Gist 设置、本机设置、主题、界面语言存放在一起。
 * 导出文件和 Gist 推送只能带走工作区：即使传入的对象上混进了其他状态，也不能写出。
 */

const SECRET = {
  token: 'secret-token-0f3a',
  gistId: 'secret-gist-9c1d',
  userName: 'secret-user-77ab',
};

const state: PersistedState = {
  workspace: edited(),
  deviceSettings: { os: 'windows', user_names: { linux: '', macos: '', windows: SECRET.userName } },
  gistSettings: { token: SECRET.token, gist_id: SECRET.gistId },
  theme: 'light',
  language: 'zh-CN',
};

/** 混进了全部本机状态的工作区，模拟调用方传错对象。 */
const leaky = { ...state.workspace, ...state, ...state.deviceSettings, ...state.gistSettings } as Workspace;

/** 写出的内容里不应出现的东西：本机状态的取值和属性名。 */
function expectOnlyWorkspace(text: string) {
  for (const value of [...Object.values(SECRET), 'windows', 'light', 'zh-CN']) {
    expect(text).not.toContain(value);
  }
  expect(Object.keys(JSON.parse(text)).toSorted()).toEqual(Object.keys(edited()).toSorted());
}

describe('隐私边界：只有工作区离开本机', () => {
  it('导出文件只包含工作区', () => {
    expectOnlyWorkspace(exportWorkspace(leaky).text);
  });

  it.each([
    ['新建 Gist', null],
    ['更新 Gist', 'my-gist'],
  ])('%s时，推送的请求体只包含工作区', async (_, gistId) => {
    const bodies: string[] = [];
    const fetch: GistConnection['fetch'] = async (_url, init) => {
      bodies.push(String(init?.body));
      return new Response(JSON.stringify({ id: 'my-gist' }), { status: 200 });
    };

    await pushWorkspace({ fetch, token: SECRET.token }, gistId, leaky, 'description');

    expect(bodies).toHaveLength(1);
    const body = JSON.parse(bodies[0]!) as { files: Record<string, { content: string }> };
    expect(Object.keys(body.files)).toEqual(['agent-weave.jsonc']);
    expect(bodies[0]).not.toContain(SECRET.token);
    expect(bodies[0]).not.toContain(SECRET.userName);
    expectOnlyWorkspace(body.files['agent-weave.jsonc']!.content);
  });
});
