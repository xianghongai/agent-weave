import {
  type Agent,
  type BuiltInTool,
  type CommandTool,
  DECISIONS,
  type JsonObject,
  type JsonValue,
  type McpOutput,
  type McpServer,
  type PermissionOutput,
  type Rule,
  SCHEMA_VERSION,
  type Scope,
  TOOL_TYPES,
  type Tag,
  type TemplatePair,
  type Workspace,
} from '@/lib/workspace';

/*
 * 工作区的结构校验：把来源不可信的数据（本地存储、导入文件、Gist）转成工作区。
 * 只检查结构和取值范围，不检查引用是否悬空：标签被删除后残留的 ID 是合法状态。
 * 结果只保留已知属性，多余的属性被丢弃。
 */

/**
 * - `invalidStructure`：不是工作区，或某个属性缺失、类型不对、取值不在范围内；
 * - `newerVersion`：结构版本比当前站点新，需要更新站点后再读取。
 */
export type WorkspaceProblem = 'invalidStructure' | 'newerVersion';

export type WorkspaceParseResult = { workspace: Workspace } | { problem: WorkspaceProblem };

/** 校验一份已经解析成 JavaScript 值的工作区。不抛异常。 */
export function parseWorkspace(value: unknown): WorkspaceParseResult {
  if (isRecord(value) && Number.isInteger(value.schema_version) && Number(value.schema_version) > SCHEMA_VERSION) {
    return { problem: 'newerVersion' };
  }
  try {
    return { workspace: workspace(value) };
  } catch (error) {
    if (error instanceof Invalid) {
      return { problem: 'invalidStructure' };
    }
    throw error;
  }
}

/* 以下解码函数遇到无效结构时抛出 `Invalid`，由 `parseWorkspace` 统一转成原因码。 */

class Invalid extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Invalid();
  }
  return value;
}

function string(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Invalid();
  }
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Invalid();
  }
  return value;
}

function oneOf<T extends string>(options: readonly T[], value: unknown): T {
  if (!options.includes(value as T)) {
    throw new Invalid();
  }
  return value as T;
}

function list<T>(item: (value: unknown) => T, value: unknown): T[] {
  if (!Array.isArray(value)) {
    throw new Invalid();
  }
  return value.map(item);
}

function nullable<T>(item: (value: unknown) => T, value: unknown): T | null {
  return value === null ? null : item(value);
}

function jsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Invalid();
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(jsonValue);
  }
  return jsonObject(value);
}

function jsonObject(value: unknown): JsonObject {
  return Object.fromEntries(Object.entries(record(value)).map(([key, item]) => [key, jsonValue(item)]));
}

function workspace(value: unknown): Workspace {
  const v = record(value);
  if (v.schema_version !== SCHEMA_VERSION) {
    throw new Invalid();
  }
  return {
    schema_version: SCHEMA_VERSION,
    updated_at: string(v.updated_at),
    tags: list(tag, v.tags),
    command_tools: list(commandTool, v.command_tools),
    mcp_servers: list(mcpServer, v.mcp_servers),
    agents: list(agent, v.agents),
    rules: list(rule, v.rules),
  };
}

function tag(value: unknown): Tag {
  const v = record(value);
  return { id: string(v.id), key: string(v.key), name: string(v.name) };
}

function commandTool(value: unknown): CommandTool {
  const v = record(value);
  return {
    id: string(v.id),
    key: string(v.key),
    description: string(v.description),
    tag_ids: list(string, v.tag_ids),
    high_risk: boolean(v.high_risk),
  };
}

function mcpServer(value: unknown): McpServer {
  const v = record(value);
  return {
    id: string(v.id),
    key: string(v.key),
    content: jsonObject(v.content),
    description: string(v.description),
    tag_ids: list(string, v.tag_ids),
    high_risk: boolean(v.high_risk),
  };
}

function templatePair(value: unknown): TemplatePair {
  const v = record(value);
  return { with_pattern: string(v.with_pattern), without_pattern: string(v.without_pattern) };
}

function builtInTool(value: unknown): BuiltInTool {
  const v = record(value);
  return {
    id: string(v.id),
    key: string(v.key),
    description: string(v.description),
    tag_ids: list(string, v.tag_ids),
    high_risk: boolean(v.high_risk),
    writes: boolean(v.writes),
    templates: templatePair(v.templates),
  };
}

function scope(value: unknown): Scope {
  const v = record(value);
  return { name: string(v.name), path: string(v.path), note: string(v.note) };
}

function permissionOutput(value: unknown): PermissionOutput {
  const v = record(value);
  const keys = record(v.decision_keys);
  return {
    property_path: string(v.property_path),
    scopes: list(scope, v.scopes),
    decision_keys: { allow: string(keys.allow), ask: string(keys.ask), deny: string(keys.deny) },
    command_templates: templatePair(v.command_templates),
    mcp_templates: templatePair(v.mcp_templates),
  };
}

function mcpOutput(value: unknown): McpOutput {
  const v = record(value);
  return {
    style: oneOf(['json', 'toml'], v.style),
    property_path: string(v.property_path),
    scopes: list(scope, v.scopes),
  };
}

function agent(value: unknown): Agent {
  const v = record(value);
  return {
    id: string(v.id),
    name: string(v.name),
    description: string(v.description),
    built_in_tools: list(builtInTool, v.built_in_tools),
    permission_output: nullable(permissionOutput, v.permission_output),
    mcp_output: nullable(mcpOutput, v.mcp_output),
  };
}

function rule(value: unknown): Rule {
  const v = record(value);
  const tool = record(v.tool);
  return {
    id: string(v.id),
    tool: { type: oneOf(TOOL_TYPES, tool.type), id: string(tool.id) },
    pattern: string(v.pattern),
    decision: oneOf(DECISIONS, v.decision),
    high_risk: boolean(v.high_risk),
  };
}
