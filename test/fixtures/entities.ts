import { type BuiltInTool, type CommandTool, type McpServer, NOT_HIGH_RISK, type Rule } from '@/lib/workspace';

/*
 * 测试用的工作区条目工厂：只写与该测试相关的字段，其余取默认值。
 * 工作区结构新增字段时，只在这里补上默认值。
 */

export function commandTool(fields: Pick<CommandTool, 'key'> & Partial<CommandTool>): CommandTool {
  return { id: `command-${fields.key}`, description: '', tag_ids: [], ...NOT_HIGH_RISK, ...fields };
}

export function mcpServer(fields: Pick<McpServer, 'key'> & Partial<McpServer>): McpServer {
  return { id: `server-${fields.key}`, content: {}, description: '', tag_ids: [], ...NOT_HIGH_RISK, ...fields };
}

export function builtInTool(fields: Pick<BuiltInTool, 'key'> & Partial<BuiltInTool>): BuiltInTool {
  return {
    id: `built-in-${fields.key}`,
    description: '',
    tag_ids: [],
    ...NOT_HIGH_RISK,
    writes: false,
    templates: { with_pattern: `${fields.key}({pattern})`, without_pattern: fields.key },
    ...fields,
  };
}

export function rule(fields: Pick<Rule, 'id' | 'tool' | 'decision'> & Partial<Rule>): Rule {
  return { pattern: '', ...NOT_HIGH_RISK, ...fields };
}
