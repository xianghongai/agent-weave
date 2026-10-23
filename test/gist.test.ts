import { describe, expect, it } from 'vitest';

import { type GistConnection, parseGistId, pullWorkspace, pushWorkspace } from '@/lib/gist';
import { exportWorkspace, importWorkspace } from '@/lib/workspace-file';

import { edited } from './fixtures/workspace';

/** 假的 `fetch` 收到的一次请求。 */
interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  cache: RequestCache | undefined;
}

/**
 * 假的 GitHub API：按顺序返回预先给定的响应，并记录收到的请求。
 * 响应写成函数时调用它，可以模拟网络失败（抛异常）。
 */
function fakeGitHub(...responses: (Response | (() => Response))[]) {
  const requests: RecordedRequest[] = [];
  const fetch: GistConnection['fetch'] = async (url, init = {}) => {
    requests.push({
      url,
      method: init.method ?? 'GET',
      headers: Object.fromEntries(new Headers(init.headers).entries()),
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      cache: init.cache,
    });
    const next = responses.shift();
    if (next === undefined) {
      throw new Error('意外的请求');
    }
    return typeof next === 'function' ? next() : next;
  };
  return { fetch, requests };
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const TOKEN = 'test-token';
const DESCRIPTION = '调用方提供的 Gist 描述';

/** 请求体中 `agent-weave.json` 的内容。 */
function fileContent(body: unknown): string {
  const files = (body as { files?: Record<string, { content?: string }> }).files;
  return files?.['agent-weave.json']?.content ?? '';
}

describe('Gist：推送', () => {
  it('没有 Gist ID 时创建 Secret Gist，内容是导出的工作区，返回新 ID', async () => {
    const github = fakeGitHub(json(201, { id: 'new-gist', files: {} }));

    const result = await pushWorkspace({ fetch: github.fetch, token: TOKEN }, null, edited(), DESCRIPTION);

    expect(result).toEqual({ gistId: 'new-gist' });
    expect(github.requests).toHaveLength(1);
    const [request] = github.requests;
    expect(request?.url).toBe('https://api.github.com/gists');
    expect(request?.method).toBe('POST');
    expect(request?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(request?.body).toMatchObject({ public: false, description: DESCRIPTION });
    expect(importWorkspace(fileContent(request?.body))).toEqual({ workspace: edited() });
  });

  it('有 Gist ID 时更新其中的 agent-weave.json，ID 不变', async () => {
    const github = fakeGitHub(json(200, { id: 'my-gist', files: {} }));

    const result = await pushWorkspace({ fetch: github.fetch, token: TOKEN }, 'my-gist', edited(), DESCRIPTION);

    expect(result).toEqual({ gistId: 'my-gist' });
    expect(github.requests).toHaveLength(1);
    const [request] = github.requests;
    expect(request?.url).toBe('https://api.github.com/gists/my-gist');
    expect(request?.method).toBe('PATCH');
    expect(request?.body).not.toHaveProperty('description');
    expect(request?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(importWorkspace(fileContent(request?.body))).toEqual({ workspace: edited() });
  });
});

/** GitHub 返回的 Gist，`agent-weave.json` 的内容为给定文本。 */
function gist(id: string, content: string, file: Record<string, unknown> = {}) {
  return {
    id,
    updated_at: '2026-10-24T08:00:00Z',
    truncated: false,
    files: {
      'agent-weave.json': { filename: 'agent-weave.json', truncated: false, content, ...file },
    },
  };
}

describe('Gist：拉取', () => {
  it('读取 agent-weave.json，经导入流程得到工作区', async () => {
    const github = fakeGitHub(json(200, gist('my-gist', exportWorkspace(edited()).text)));

    const result = await pullWorkspace({ fetch: github.fetch, token: TOKEN }, 'my-gist');

    expect(result).toEqual({ workspace: edited() });
    expect(github.requests).toHaveLength(1);
    const [request] = github.requests;
    expect(request?.url).toBe('https://api.github.com/gists/my-gist');
    expect(request?.method).toBe('GET');
    expect(request?.headers.authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('不使用浏览器缓存：GitHub 允许缓存 60 秒，刚在其他设备推送的内容会读不到', async () => {
    const github = fakeGitHub(json(200, gist('my-gist', exportWorkspace(edited()).text)));

    await pullWorkspace({ fetch: github.fetch, token: TOKEN }, 'my-gist');

    expect(github.requests[0]?.cache).toBe('no-store');
  });

  it('Gist 中没有 agent-weave.json 时返回 fileMissing', async () => {
    const github = fakeGitHub(json(200, { ...gist('my-gist', ''), files: { 'notes.md': { content: '# 笔记' } } }));

    const result = await pullWorkspace({ fetch: github.fetch, token: TOKEN }, 'my-gist');

    expect(result).toEqual({ problem: 'fileMissing' });
  });

  it('文件超过 API 返回的上限、内容被截断时返回 fileTruncated，不去读取其他域名上的原始文件', async () => {
    const text = exportWorkspace(edited()).text;
    const github = fakeGitHub(json(200, gist('my-gist', text.slice(0, 100), { truncated: true })));

    const result = await pullWorkspace({ fetch: github.fetch, token: TOKEN }, 'my-gist');

    expect(result).toEqual({ problem: 'fileTruncated' });
    expect(github.requests).toHaveLength(1);
  });

  it.each([
    ['不是 JSON', '这不是工作区', 'parseFailed'],
    ['不是工作区', '{"hello": "world"}', 'invalidStructure'],
    ['来自更新版本的工具', JSON.stringify({ ...edited(), schema_version: 999 }), 'newerVersion'],
  ])('文件内容%s时返回 invalidContent，并附上导入流程的原因码', async (_, content, importProblem) => {
    const github = fakeGitHub(json(200, gist('my-gist', content)));

    const result = await pullWorkspace({ fetch: github.fetch, token: TOKEN }, 'my-gist');

    expect(result).toEqual({ problem: 'invalidContent', importProblem });
  });
});

describe('Gist：认证', () => {
  it('没有填写 Token 时也可以拉取 Secret Gist，请求不带 Authorization', async () => {
    const github = fakeGitHub(json(200, gist('my-gist', exportWorkspace(edited()).text)));

    const result = await pullWorkspace({ fetch: github.fetch, token: '  ' }, 'my-gist');

    expect(result).toEqual({ workspace: edited() });
    expect(github.requests[0]?.headers).not.toHaveProperty('authorization');
  });
});

describe('Gist：请求失败', () => {
  it('Token 无效时返回 unauthorized', async () => {
    const github = fakeGitHub(json(401, { message: 'Bad credentials' }));

    const result = await pullWorkspace({ fetch: github.fetch, token: TOKEN }, 'my-gist');

    expect(result).toEqual({ problem: 'unauthorized' });
  });

  it.each([
    ['创建', null],
    ['更新', 'my-gist'],
  ])('推送时 Token 权限不足，%s Gist 返回 unauthorized', async (_, gistId) => {
    const github = fakeGitHub(json(403, { message: 'Resource not accessible by personal access token' }));

    const result = await pushWorkspace({ fetch: github.fetch, token: TOKEN }, gistId, edited(), DESCRIPTION);

    expect(result).toEqual({ problem: 'unauthorized' });
  });

  it('拉取时 Gist 不存在返回 notFound', async () => {
    const github = fakeGitHub(json(404, { message: 'Not Found' }));

    const result = await pullWorkspace({ fetch: github.fetch, token: TOKEN }, 'missing-gist');

    expect(result).toEqual({ problem: 'notFound' });
  });

  it('推送时要更新的 Gist 不存在返回 notFound，不会改为创建新 Gist', async () => {
    const github = fakeGitHub(json(404, { message: 'Not Found' }));

    const result = await pushWorkspace({ fetch: github.fetch, token: TOKEN }, 'missing-gist', edited(), DESCRIPTION);

    expect(result).toEqual({ problem: 'notFound' });
    expect(github.requests).toHaveLength(1);
  });

  it('网络失败时返回 networkFailed，不抛异常', async () => {
    const offline = () => {
      throw new TypeError('Failed to fetch');
    };

    const pulled = await pullWorkspace({ fetch: fakeGitHub(offline).fetch, token: TOKEN }, 'my-gist');
    const pushed = await pushWorkspace({ fetch: fakeGitHub(offline).fetch, token: TOKEN }, null, edited(), DESCRIPTION);

    expect(pulled).toEqual({ problem: 'networkFailed' });
    expect(pushed).toEqual({ problem: 'networkFailed' });
  });

  it.each([
    ['403 且剩余次数为 0', () => json(403, { message: 'API rate limit exceeded' }, { 'x-ratelimit-remaining': '0' })],
    ['429', () => json(429, { message: 'You have exceeded a secondary rate limit' })],
  ])('超出 API 调用频率限制（%s）时返回 rateLimited，而不是误报 Token 无效', async (_, response) => {
    const github = fakeGitHub(response);

    const result = await pullWorkspace({ fetch: github.fetch, token: TOKEN }, 'my-gist');

    expect(result).toEqual({ problem: 'rateLimited' });
  });

  it.each([
    ['服务端出错', () => json(500, { message: 'Server Error' })],
    ['请求被拒绝', () => json(422, { message: 'Validation Failed' })],
    ['响应不是 JSON', () => new Response('<html>维护中</html>', { status: 200 })],
    ['响应缺少文件列表', () => json(200, { id: 'my-gist' })],
  ])('%s时返回 unexpectedResponse', async (_, response) => {
    const github = fakeGitHub(response);

    const result = await pullWorkspace({ fetch: github.fetch, token: TOKEN }, 'my-gist');

    expect(result).toEqual({ problem: 'unexpectedResponse' });
  });

  it('创建 Gist 的响应缺少 ID 时返回 unexpectedResponse', async () => {
    const github = fakeGitHub(json(201, { files: {} }));

    const result = await pushWorkspace({ fetch: github.fetch, token: TOKEN }, null, edited(), DESCRIPTION);

    expect(result).toEqual({ problem: 'unexpectedResponse' });
  });
});

describe('Gist：识别用户填写的 ID', () => {
  it.each([
    ['ID', 'aa5a315d61ae9438b18d', 'aa5a315d61ae9438b18d'],
    ['前后带空白的 ID', '  aa5a315d61ae9438b18d\n', 'aa5a315d61ae9438b18d'],
    ['Gist 页面的网址', 'https://gist.github.com/someone/aa5a315d61ae9438b18d', 'aa5a315d61ae9438b18d'],
    [
      '带锚点和末尾斜杠的网址',
      'https://gist.github.com/someone/aa5a315d61ae9438b18d/#file-agent-weave-json',
      'aa5a315d61ae9438b18d',
    ],
  ])('%s', (_, input, expected) => {
    expect(parseGistId(input)).toBe(expected);
  });

  it.each([
    ['空串', '  '],
    ['带路径分隔的文本', '../users'],
    ['不是十六进制', 'not a gist'],
  ])('无法识别时返回 null：%s', (_, input) => {
    expect(parseGistId(input)).toBeNull();
  });
});
