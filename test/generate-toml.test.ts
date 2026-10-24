import { describe, expect, it } from 'vitest';

import { generate } from '@/lib/generate';
import { createPresetWorkspace } from '@/lib/presets';
import { type Agent, EMPTY_DEVICE_SETTINGS, type JsonObject, type Workspace } from '@/lib/workspace';

/** 只有 TOML 风格 MCP 输出的 Agent，形同 Codex CLI。 */
const codex: Agent = {
  id: 'agent-codex',
  name: 'Codex CLI',
  description: '',
  built_in_tools: [],
  permission_output: null,
  mcp_output: {
    style: 'toml',
    property_path: 'mcp_servers',
    scopes: [{ name: '用户级', path: '~/.codex/config.toml', note: '' }],
  },
};

function workspace(servers: Record<string, JsonObject>, agent: Agent = codex): Workspace {
  return {
    schema_version: 1,
    updated_at: '2026-10-23T00:00:00.000Z',
    tags: [],
    command_tools: [],
    mcp_servers: Object.entries(servers).map(([key, content]) => ({
      id: `server-${key}`,
      key,
      content,
      description: '',
      tag_ids: [],
      high_risk: false,
      high_risk_reason: '',
    })),
    agents: [agent],
    rules: [],
  };
}

function tomlOutput(servers: Record<string, JsonObject>, agent: Agent = codex) {
  return generate(workspace(servers, agent), agent.id, EMPTY_DEVICE_SETTINGS);
}

describe('生成：TOML 风格的 MCP 输出', () => {
  it('每个 Server 生成一个表，字符串、数字、布尔值按 TOML 语法输出', () => {
    const output = tomlOutput({ x: { command: 'npx', timeout: 30, ratio: 1.5, enabled: true, debug: false } });
    const expected = [
      '[mcp_servers.x]',
      'command = "npx"',
      'timeout = 30',
      'ratio = 1.5',
      'enabled = true',
      'debug = false',
    ].join('\n');
    expect(output?.mcp?.style).toBe('toml');
    expect(output?.mcp?.preview).toBe(expected);
    expect(output?.mcp?.copyText).toBe(expected);
    expect(output?.mcp?.copyInnerText).toBeNull();
    expect(output?.mcp?.scopes).toEqual([{ name: '用户级', path: '~/.codex/config.toml', note: '' }]);
  });

  it('数组写成行内数组，元素按各自的类型输出', () => {
    const output = tomlOutput({
      x: { args: ['-y', '@upstash/context7-mcp'], ports: [1, 2], empty: [], nested: [[true], []] },
    });
    expect(output?.mcp?.copyText).toBe(
      [
        '[mcp_servers.x]',
        'args = ["-y", "@upstash/context7-mcp"]',
        'ports = [1, 2]',
        'empty = []',
        'nested = [[true], []]',
      ].join('\n')
    );
  });

  it('嵌套对象生成子表，排在本表的键值对之后；多个 Server 按标识排序，以空行分隔', () => {
    const output = tomlOutput({
      'z-server': { url: 'https://example.com/mcp' },
      context7: {
        env: { CONTEXT7_API_KEY: '${CONTEXT7_API_KEY}' },
        command: 'npx',
        http: { headers: { 'X-Trace': 'on' }, retries: 3 },
        empty: {},
      },
    });
    expect(output?.mcp?.copyText).toBe(
      [
        '[mcp_servers.context7]',
        'command = "npx"',
        '',
        '[mcp_servers.context7.env]',
        'CONTEXT7_API_KEY = "${CONTEXT7_API_KEY}"',
        '',
        '[mcp_servers.context7.http]',
        'retries = 3',
        '',
        '[mcp_servers.context7.http.headers]',
        'X-Trace = "on"',
        '',
        '[mcp_servers.context7.empty]',
        '',
        '[mcp_servers.z-server]',
        'url = "https://example.com/mcp"',
      ].join('\n')
    );
  });

  it('多层属性路径直接写进表头', () => {
    const nested: Agent = { ...codex, mcp_output: { style: 'toml', property_path: 'a.servers', scopes: [] } };
    expect(tomlOutput({ x: { command: 'npx' } }, nested)?.mcp?.copyText).toBe('[a.servers.x]\ncommand = "npx"');
  });

  it('没有 MCP Server 时输出为空', () => {
    expect(tomlOutput({})?.mcp?.copyText).toBe('');
  });

  it('字符串中的引号、反斜杠与控制字符被转义，其他字符原样保留', () => {
    const output = tomlOutput({ x: { text: 'say "hi"\\path\nline\ttab\u0001\u007f中文 ${VAR}' } });
    expect(output?.mcp?.copyText).toBe(
      '[mcp_servers.x]\ntext = "say \\"hi\\"\\\\path\\nline\\ttab\\u0001\\u007f中文 ${VAR}"'
    );
  });

  it('不能作为裸键的键加引号，包括 Server 标识与子表名', () => {
    const output = tomlOutput({
      'my.server': { 'a key': 1, 'x"y': 2, 中文: 3, '': 4, env: {}, 'sub table': {} },
    });
    expect(output?.mcp?.copyText).toBe(
      [
        '[mcp_servers."my.server"]',
        '"a key" = 1',
        '"x\\"y" = 2',
        '"中文" = 3',
        '"" = 4',
        '',
        '[mcp_servers."my.server".env]',
        '',
        '[mcp_servers."my.server"."sub table"]',
      ].join('\n')
    );
  });

  it('null 无法用 TOML 表达：跳过该字段并逐个产生提示；含 null 的数组整个跳过', () => {
    const output = tomlOutput({
      a: { command: 'npx', cwd: null, args: ['-y', null], env: { TOKEN: null, MODE: 'dev' } },
      b: { url: null },
    });
    expect(output?.mcp?.copyText).toBe(
      ['[mcp_servers.a]', 'command = "npx"', '', '[mcp_servers.a.env]', 'MODE = "dev"', '', '[mcp_servers.b]'].join(
        '\n'
      )
    );
    expect(output?.notices).toEqual([
      { type: 'tomlFieldSkipped', serverId: 'server-a', field: 'cwd' },
      { type: 'tomlFieldSkipped', serverId: 'server-a', field: 'args' },
      { type: 'tomlFieldSkipped', serverId: 'server-a', field: 'env.TOKEN' },
      { type: 'tomlFieldSkipped', serverId: 'server-b', field: 'url' },
    ]);
  });

  it('数组中的对象写成行内表；行内表里出现 null 时整个数组跳过', () => {
    const output = tomlOutput({
      x: { items: [{ name: 'a b', on: true, tags: ['t'], 'k.k': { n: 1 } }, {}], broken: [{ gone: null }] },
    });
    expect(output?.mcp?.copyText).toBe(
      '[mcp_servers.x]\nitems = [{ name = "a b", on = true, tags = ["t"], "k.k" = { n = 1 } }, {}]'
    );
    expect(output?.notices).toEqual([{ type: 'tomlFieldSkipped', serverId: 'server-x', field: 'broken' }]);
  });

  it('没有字段被跳过时不产生提示', () => {
    expect(tomlOutput({ x: { command: 'npx' } })?.notices).toEqual([]);
  });
});

describe('生成：预设 Codex CLI', () => {
  const preset = createPresetWorkspace();
  const agent = preset.agents.find((candidate) => candidate.name === 'Codex CLI');
  const output = agent ? generate(preset, agent.id, EMPTY_DEVICE_SETTINGS) : null;

  it('不输出权限，也就没有跳过的规则', () => {
    expect(output).not.toBeNull();
    expect(output?.permission).toBeNull();
    expect(output?.skippedRules).toEqual([]);
  });

  it('MCP 输出为 TOML 风格的 mcp_servers 表，作用域为用户级与项目级的 config.toml', () => {
    expect(output?.mcp?.style).toBe('toml');
    expect(output?.mcp?.copyText.startsWith('[mcp_servers.chrome-devtools]\n')).toBe(true);
    expect(output?.mcp?.copyText).toContain('\n\n[mcp_servers.context7]\n');
    expect(output?.mcp?.copyText).toContain('\n\n[mcp_servers.filesystem]\n');
    expect(output?.mcp?.copyText).toContain('\n\n[mcp_servers.sequential-thinking]\n');
    expect(output?.mcp?.copyInnerText).toBeNull();
    expect(output?.mcp?.scopes.map((scope) => scope.path)).toEqual(['~/.codex/config.toml', '.codex/config.toml']);
  });
});
