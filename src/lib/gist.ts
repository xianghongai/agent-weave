import type { Workspace } from '@/lib/workspace';
import { type ImportProblem, exportWorkspace, importWorkspace } from '@/lib/workspace-file';

/*
 * Gist 客户端：通过用户自己的 GitHub Gist 手动同步工作区。
 * `fetch` 由调用方注入，测试时使用假的实现；运行时只访问 `api.github.com`。
 * 出错时返回原因码，不抛异常，由界面层翻译成提示。
 */

/** 工作区在 Gist 中的文件名。 */
export const GIST_FILE_NAME = 'agent-weave.jsonc';

const API_ROOT = 'https://api.github.com';

/** `fetch` 中本模块用到的部分。 */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** 访问 GitHub API 所需的依赖。 */
export interface GistConnection {
  fetch: FetchLike;
  /** 只有 Gist 权限的 Token。拉取时可以为空串，推送必须提供。 */
  token: string;
}

/** 只保存在本机的 Gist 设置，与工作区分开存储，不进入导出文件。 */
export interface GistSettings {
  /** 只有 Gist 权限的 Token，空串表示未填写。 */
  token: string;
  /** 用户填写或推送时自动创建的 Gist ID，空串表示还没有。 */
  gist_id: string;
}

export const EMPTY_GIST_SETTINGS: Readonly<GistSettings> = { token: '', gist_id: '' };

/**
 * 请求 GitHub API 失败的原因：
 * - `unauthorized`：Token 无效、已过期或权限不足；
 * - `notFound`：Gist 不存在，或 Token 无权修改它；
 * - `rateLimited`：超出 GitHub API 的调用频率限制，稍后再试；
 * - `networkFailed`：请求没有得到响应，如离线；
 * - `unexpectedResponse`：GitHub 返回了其他错误，或响应不是预期的格式。
 */
export type GistRequestProblem = 'unauthorized' | 'notFound' | 'rateLimited' | 'networkFailed' | 'unexpectedResponse';

/**
 * 远端内容无法使用的原因：
 * - `fileMissing`：Gist 中没有 `agent-weave.jsonc`；
 * - `fileTruncated`：文件超过 API 返回内容的上限（1 MB），内容被截断；
 * - `invalidContent`：文件没有通过导入流程，具体原因见 `importProblem`，能定位到条目时带上 `entryId`。
 */
export type GistContentFailure =
  | { problem: 'fileMissing' | 'fileTruncated' }
  | { problem: 'invalidContent'; importProblem: ImportProblem; entryId?: string };

/** 请求本身成功，但远端内容无法使用：推送时仍可以整体覆盖它。 */
export function isContentFailure(failure: { problem: string }): failure is GistContentFailure {
  return CONTENT_PROBLEMS.has(failure.problem);
}

const CONTENT_PROBLEMS: ReadonlySet<string> = new Set<GistContentFailure['problem']>([
  'fileMissing',
  'fileTruncated',
  'invalidContent',
]);

/** 推送成功时返回 Gist ID：新建时是新 ID，更新时与传入的相同。 */
export type PushResult = { gistId: string } | { problem: GistRequestProblem };

export type PullResult = { workspace: Workspace } | { problem: GistRequestProblem } | GistContentFailure;

/**
 * 推送工作区，整体覆盖远端。
 * `gistId` 为 `null` 时创建 Secret Gist，返回新 ID，由调用方保存。
 * `description` 是新建 Gist 的描述，说明它的来源；属于界面文案，由调用方提供。更新时不修改描述。
 */
export async function pushWorkspace(
  connection: GistConnection,
  gistId: string | null,
  workspace: Workspace,
  description: string
): Promise<PushResult> {
  const files = { [GIST_FILE_NAME]: { content: exportWorkspace(workspace).text } };
  // 更新时只提交这一个文件，Gist 中的其他文件保持不变。
  const response =
    gistId === null
      ? await request(connection, `${API_ROOT}/gists`, {
          method: 'POST',
          body: { description, public: false, files },
        })
      : await request(connection, gistUrl(gistId), { method: 'PATCH', body: { files } });
  if ('problem' in response) {
    return response;
  }
  const id = isRecord(response.body) ? response.body.id : undefined;
  if (typeof id !== 'string' || id === '') {
    return { problem: 'unexpectedResponse' };
  }
  return { gistId: id };
}

/** 拉取工作区：读取 Gist 中的 `agent-weave.jsonc`，交给导入流程解析、迁移和校验。 */
export async function pullWorkspace(connection: GistConnection, gistId: string): Promise<PullResult> {
  const response = await request(connection, gistUrl(gistId), { method: 'GET' });
  if ('problem' in response) {
    return response;
  }
  const files = isRecord(response.body) ? response.body.files : undefined;
  if (!isRecord(files)) {
    return { problem: 'unexpectedResponse' };
  }
  const file = files[GIST_FILE_NAME];
  if (file === undefined || file === null) {
    return { problem: 'fileMissing' };
  }
  // 完整内容在 `raw_url` 指向的其他域名上，CSP 只放行 `api.github.com`，因此不去读取。
  if (!isRecord(file) || file.truncated === true) {
    return { problem: 'fileTruncated' };
  }
  if (typeof file.content !== 'string') {
    return { problem: 'unexpectedResponse' };
  }
  const imported = importWorkspace(file.content);
  return 'workspace' in imported
    ? imported
    : { problem: 'invalidContent', importProblem: imported.problem, entryId: imported.entryId };
}

/** 浏览器的 `fetch`。每次调用时才访问它，并以 `globalThis` 调用，避免脱离宿主对象后报错。 */
export const browserFetch: FetchLike = (url, init) => globalThis.fetch(url, init);

/**
 * 从用户填写的内容中取出 Gist ID：可以是 ID 本身，也可以是 Gist 页面的网址。
 * 无法识别时返回 `null`。Gist ID 是十六进制串，检查它也避免了把其他路径拼进请求网址。
 */
export function parseGistId(input: string): string | null {
  const path = input
    .trim()
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
  const id = path.slice(path.lastIndexOf('/') + 1);
  return /^[0-9a-f]+$/i.test(id) ? id : null;
}

/**
 * Gist 设置的状态，由界面翻译成文案、决定按钮是否可用：
 * - `token`：`configured` 已填写，`missing` 未填写；
 * - `gist`：`linked` 已关联（附带取出的 ID），`missing` 未填写，`invalid` 无法识别；
 * - `canPush`：推送需要 Token，没有 Gist ID 时新建，Gist ID 无效时不能推送；
 * - `canPull`：拉取只需要有效的 Gist ID，没有 Token 时匿名读取。
 */
export interface GistSettingsStatus {
  token: 'configured' | 'missing';
  gist: { status: 'linked'; gistId: string } | { status: 'missing' | 'invalid' };
  canPush: boolean;
  canPull: boolean;
}

export function gistSettingsStatus(settings: GistSettings): GistSettingsStatus {
  const token = settings.token.trim() === '' ? 'missing' : 'configured';
  const input = settings.gist_id.trim();
  const gistId = input === '' ? null : parseGistId(input);
  const gist: GistSettingsStatus['gist'] =
    gistId !== null ? { status: 'linked', gistId } : { status: input === '' ? 'missing' : 'invalid' };
  return {
    token,
    gist,
    canPush: token === 'configured' && gist.status !== 'invalid',
    canPull: gist.status === 'linked',
  };
}

function gistUrl(gistId: string): string {
  return `${API_ROOT}/gists/${encodeURIComponent(gistId)}`;
}

/** 发出请求并读取 JSON 响应。请求失败时返回原因码。 */
async function request(
  connection: GistConnection,
  url: string,
  init: { method: 'GET' | 'POST' | 'PATCH'; body?: unknown }
): Promise<{ body: unknown } | { problem: GistRequestProblem }> {
  let response: Response;
  try {
    response = await connection.fetch(url, {
      method: init.method,
      headers: headers(connection.token),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      // GitHub API 的响应允许浏览器缓存一段时间，不跳过缓存就可能读到其他设备推送之前的内容。
      cache: 'no-store',
    });
  } catch {
    // 离线、DNS 失败、被 CORS 或 CSP 拦截时，`fetch` 都以异常结束，浏览器不提供更多细节。
    return { problem: 'networkFailed' };
  }
  // GitHub 用 403 同时表示权限不足和超出频率限制，后者的剩余次数为 0。
  if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) {
    return { problem: 'rateLimited' };
  }
  if (response.status === 401 || response.status === 403) {
    return { problem: 'unauthorized' };
  }
  // 对没有写入权限的 Gist，GitHub 也可能返回 404 而不是 403，以免泄露它是否存在。
  if (response.status === 404) {
    return { problem: 'notFound' };
  }
  if (!response.ok) {
    return { problem: 'unexpectedResponse' };
  }
  try {
    return { body: (await response.json()) as unknown };
  } catch {
    return { problem: 'unexpectedResponse' };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function headers(token: string): Record<string, string> {
  const result: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10',
  };
  // 知道 ID 就能匿名读取 Secret Gist；没有 Token 时不带认证，GitHub 按匿名请求处理。
  if (token.trim() !== '') {
    result.Authorization = `Bearer ${token.trim()}`;
  }
  return result;
}
