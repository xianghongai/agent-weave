import type { McpServer } from '@/lib/workspace';

/*
 * 预设 MCP Server。内部 ID 是固定值，“合并预设”按它判断条目是否已存在。
 * 内容是 Claude 风格的 JSON；个人路径写成 `{{home}}`，密钥写成 `${VAR}` 留在本机环境变量里。
 * 内容中自带的 `description` 挪到描述字段，描述不进入输出。
 */
export const PRESET_MCP_SERVERS: McpServer[] = [
  {
    id: 'preset-mcp-context7',
    key: 'context7',
    content: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp@latest'],
      env: { CONTEXT7_API_KEY: '${CONTEXT7_API_KEY}' },
    },
    description: '查询各类库与框架的最新文档',
    tag_ids: [],
    high_risk: false,
  },
  {
    id: 'preset-mcp-filesystem',
    key: 'filesystem',
    content: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '{{home}}'],
    },
    description: '读写主目录下的文件',
    tag_ids: [],
    high_risk: false,
  },
  {
    id: 'preset-mcp-sequential-thinking',
    key: 'sequential-thinking',
    content: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    },
    description: '分步推理',
    tag_ids: [],
    high_risk: false,
  },
];
