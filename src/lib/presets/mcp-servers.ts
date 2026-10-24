import { presetTagId, type PresetTagKey } from '@/lib/presets/tags';
import { NOT_HIGH_RISK, type JsonObject, type McpServer } from '@/lib/workspace';

/** 预设 MCP Server 的内部 ID。 */
export function presetMcpServerId(key: string): string {
  return `preset-mcp-${key}`;
}

function server(key: string, description: string, tags: PresetTagKey[], content: JsonObject): McpServer {
  return {
    id: presetMcpServerId(key),
    key,
    content,
    description,
    tag_ids: tags.map(presetTagId),
    ...NOT_HIGH_RISK,
  };
}

/** 用 npx 启动的 stdio Server。 */
function npx(...args: string[]): JsonObject {
  return { type: 'stdio', command: 'npx', args: ['-y', ...args] };
}

/*
 * 预设 MCP Server。内部 ID 是固定值，“合并预设”按它判断条目是否已存在。
 * 内容是 Claude 风格的 JSON；个人路径写成 `{{home}}`，密钥写成 `${VAR}` 留在本机环境变量里。
 * 内容中自带的 `description` 挪到描述字段，描述不进入输出。
 * 只与某台机器相关的参数不收录，如 Firefox 的安装路径（工具能自动查找）和调试日志文件。
 */
export const PRESET_MCP_SERVERS: McpServer[] = [
  server(
    'chrome-devtools',
    '控制并调试已打开的 Chrome。需先在 chrome://inspect/#remote-debugging 开启远程调试',
    ['browser'],
    npx(
      'chrome-devtools-mcp@latest',
      '--auto-connect',
      '--category-extensions',
      '--no-usage-statistics',
      '--no-performance-crux'
    )
  ),
  server(
    'firefox-devtools',
    '控制并调试已打开的 Firefox',
    ['browser'],
    npx('@mozilla/firefox-devtools-mcp@latest', '--connect-existing', '--tool-preset', 'developer')
  ),
  server('playwright', '用 Playwright 自动操作浏览器', ['browser'], npx('@playwright/mcp@latest')),
  server(
    'filesystem',
    '读写主目录下的文件',
    ['filesystem'],
    npx('@modelcontextprotocol/server-filesystem', '{{home}}')
  ),
  server(
    'github',
    '操作 GitHub 仓库、Issue 与 PR。需要环境变量 GITHUB_PERSONAL_ACCESS_TOKEN；该 npm 包已停止维护',
    ['vcs', 'network'],
    npx('@modelcontextprotocol/server-github')
  ),
  server('context7', '查询各类库与框架的最新文档', ['search', 'network'], {
    ...npx('@upstash/context7-mcp@latest'),
    env: { CONTEXT7_API_KEY: '${CONTEXT7_API_KEY}' },
  }),
  // 存储位置只能通过环境变量 MEMORY_FILE_PATH 指定，Server 自己展开 `~`。
  server('memory', '以知识图谱形式保存长期记忆', [], {
    ...npx('@modelcontextprotocol/server-memory'),
    env: { MEMORY_FILE_PATH: '~/.local/agent/share/mcp-memory.json' },
  }),
  server('sequential-thinking', '分步推理', [], npx('@modelcontextprotocol/server-sequential-thinking')),
];
