import { describe, expect, it } from 'vitest';

import { type KeyValueStorage, STORAGE_KEYS, loadWorkspace, saveWorkspace } from '@/lib/persistence';
import { createPresetWorkspace } from '@/lib/presets';
import type { Workspace } from '@/lib/workspace';
import { parseWorkspace } from '@/lib/workspace-validation';

/**
 * 内存中的存储替身，可以让读或写抛异常，模拟隐私模式和配额已满。
 * 每次读写时才查看选项，用例可以中途切换。
 */
function memoryStorage(options: { failRead?: boolean; failWrite?: boolean } = {}) {
  const items = new Map<string, string>();
  const storage: KeyValueStorage = {
    getItem: (key) => {
      if (options.failRead) {
        throw new Error('SecurityError');
      }
      return items.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (options.failWrite) {
        throw new Error('QuotaExceededError');
      }
      items.set(key, value);
    },
  };
  return { storage, items };
}

/** 每类条目都至少有一个、可选部分都有值的工作区。 */
function edited(): Workspace {
  return {
    schema_version: 1,
    updated_at: '2026-10-23T12:00:00.000Z',
    tags: [{ id: 'tag-1', key: 'vcs', name: '版本控制' }],
    command_tools: [
      { id: 'tool-1', key: 'make', description: '构建', tag_ids: ['tag-1', 'tag-gone'], high_risk: true },
    ],
    mcp_servers: [
      {
        id: 'mcp-1',
        key: 'github',
        content: { command: 'npx', args: ['-y', 'server'], env: { TOKEN: '${TOKEN}' }, timeout: 30, debug: null },
        description: '',
        tag_ids: [],
        high_risk: false,
      },
    ],
    agents: [
      {
        id: 'agent-1',
        name: 'Claude Code',
        description: '',
        built_in_tools: [
          {
            id: 'builtin-1',
            key: 'Read',
            description: '',
            tag_ids: [],
            high_risk: false,
            writes: false,
            templates: { with_pattern: 'Read({pattern})', without_pattern: 'Read' },
          },
        ],
        permission_output: {
          property_path: 'permissions',
          scopes: [{ name: '用户级', path: '~/.claude/settings.json', note: '' }],
          decision_keys: { allow: 'allow', ask: 'ask', deny: '' },
          command_templates: { with_pattern: 'Bash({command} {pattern} *)', without_pattern: 'Bash({command} *)' },
          mcp_templates: { with_pattern: 'mcp__{server}__{pattern}', without_pattern: 'mcp__{server}' },
        },
        mcp_output: { style: 'json', property_path: 'mcpServers', scopes: [] },
      },
    ],
    rules: [
      { id: 'rule-1', tool: { type: 'command', id: 'tool-1' }, pattern: '', decision: 'allow', high_risk: false },
      {
        id: 'rule-2',
        tool: { type: 'built_in', id: 'builtin-1' },
        pattern: './src/**',
        decision: 'deny',
        high_risk: true,
      },
    ],
  };
}

/** 把合法工作区某个位置的值改掉（`undefined` 表示删除该属性），返回 JSON 文本。 */
function corrupt(path: (string | number)[], value: unknown): string {
  const root: unknown = structuredClone(edited());
  const parent = path.slice(0, -1).reduce<unknown>((node, step) => (node as Record<string, unknown>)[step], root);
  const last = path[path.length - 1]!;
  if (value === undefined) {
    delete (parent as Record<string, unknown>)[last];
  } else {
    (parent as Record<string, unknown>)[last] = value;
  }
  return JSON.stringify(root);
}

describe('持久化：工作区', () => {
  it('保存后再读取，得到同样的工作区', () => {
    const { storage } = memoryStorage();
    expect(saveWorkspace(storage, edited())).toBeNull();
    expect(loadWorkspace(storage)).toEqual({ workspace: edited(), problem: null });
  });

  it('首次访问时没有本地数据，载入预设且不提示', () => {
    const { storage } = memoryStorage();
    expect(loadWorkspace(storage)).toEqual({ workspace: createPresetWorkspace(), problem: null });
  });

  it('本地数据无法解析时回退到预设，并给出原因码', () => {
    const { storage, items } = memoryStorage();
    items.set(STORAGE_KEYS.workspace, '{"schema_version": 1, "tags": [');
    expect(loadWorkspace(storage)).toEqual({ workspace: createPresetWorkspace(), problem: 'parseFailed' });
  });

  it.each([
    ['不是对象', '[]'],
    ['不是工作区', '"hello"'],
    ['缺少规则列表', corrupt(['rules'], undefined)],
    ['修改时间不是字符串', corrupt(['updated_at'], 0)],
    ['结构版本不是整数', corrupt(['schema_version'], '1')],
    ['标签缺少名称', corrupt(['tags', 0, 'name'], undefined)],
    ['命令工具缺少标识', corrupt(['command_tools', 0, 'key'], undefined)],
    ['标签 ID 不是字符串', corrupt(['command_tools', 0, 'tag_ids'], [1])],
    ['高危标记不是布尔值', corrupt(['command_tools', 0, 'high_risk'], 'yes')],
    ['MCP Server 的内容不是对象', corrupt(['mcp_servers', 0, 'content'], [])],
    ['内置工具缺少模板', corrupt(['agents', 0, 'built_in_tools', 0, 'templates'], undefined)],
    ['作用域缺少路径', corrupt(['agents', 0, 'permission_output', 'scopes', 0, 'path'], undefined)],
    ['决策键名映射不完整', corrupt(['agents', 0, 'permission_output', 'decision_keys', 'ask'], undefined)],
    ['MCP 模板不是字符串', corrupt(['agents', 0, 'permission_output', 'mcp_templates', 'with_pattern'], null)],
    ['MCP 输出风格未知', corrupt(['agents', 0, 'mcp_output', 'style'], 'yaml')],
    ['规则的决策不在取值范围内', corrupt(['rules', 0, 'decision'], 'maybe')],
    ['规则的工具类型未知', corrupt(['rules', 0, 'tool', 'type'], 'plugin')],
  ])('本地数据结构无效（%s）时回退到预设，并给出原因码', (_, text) => {
    const { storage, items } = memoryStorage();
    items.set(STORAGE_KEYS.workspace, text);
    expect(loadWorkspace(storage)).toEqual({ workspace: createPresetWorkspace(), problem: 'invalidStructure' });
  });

  it('本地数据来自更新的版本时回退到预设，并给出原因码', () => {
    const { storage, items } = memoryStorage();
    items.set(STORAGE_KEYS.workspace, corrupt(['schema_version'], 2));
    expect(loadWorkspace(storage)).toEqual({ workspace: createPresetWorkspace(), problem: 'newerVersion' });
  });

  it('存储无法读取时回退到预设，并给出原因码', () => {
    const { storage } = memoryStorage({ failRead: true });
    expect(loadWorkspace(storage)).toEqual({ workspace: createPresetWorkspace(), problem: 'readFailed' });
  });

  it('写入失败时返回原因码，不抛异常，原有数据不变', () => {
    const options = { failWrite: false };
    const { storage } = memoryStorage(options);
    expect(saveWorkspace(storage, edited())).toBeNull();
    options.failWrite = true;
    expect(saveWorkspace(storage, createPresetWorkspace())).toBe('writeFailed');
    expect(loadWorkspace(storage)).toEqual({ workspace: edited(), problem: null });
  });

  it('只写工作区自己的键，不碰本机设置和 Gist 设置', () => {
    const { storage, items } = memoryStorage();
    items.set(STORAGE_KEYS.deviceSettings, 'device');
    items.set(STORAGE_KEYS.gistSettings, 'gist');
    saveWorkspace(storage, edited());
    expect(items.get(STORAGE_KEYS.deviceSettings)).toBe('device');
    expect(items.get(STORAGE_KEYS.gistSettings)).toBe('gist');
  });
});

describe('工作区校验', () => {
  it('预设工作区通过校验', () => {
    expect(parseWorkspace(createPresetWorkspace())).toEqual({ workspace: createPresetWorkspace() });
  });
});
