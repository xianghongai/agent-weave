/*
 * 工作区模型：一位用户的全部数据，即中立规则集与 Agent 定义的总和。
 * 工作区会原样保存、导出和同步，因此属性名一律使用 snake_case。
 * 条目之间只用内部 ID 引用，修改标识不需要改动引用；内部 ID 不在界面上显示。
 */

/** 当前的工作区结构版本。结构变化时递增，并在导入时迁移旧版本。 */
export const SCHEMA_VERSION = 1;

/** 决策，按输出顺序排列。 */
export const DECISIONS = ['allow', 'ask', 'deny'] as const;
export type Decision = (typeof DECISIONS)[number];

/** 工具类型，按规则列表和输出的排序顺序排列。 */
export const TOOL_TYPES = ['command', 'mcp', 'built_in'] as const;
export type ToolType = (typeof TOOL_TYPES)[number];

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface Tag {
  id: string;
  /** 标识，在全部标签中唯一。 */
  key: string;
  name: string;
}

export interface CommandTool {
  id: string;
  /** 标识，即命令本身，如 `git`、`./gradlew`；在全部命令工具中唯一。 */
  key: string;
  /** 可选描述，空字符串表示没有描述。 */
  description: string;
  /** 标签被删除后，这里残留的 ID 保留不动。 */
  tag_ids: string[];
  high_risk: boolean;
}

export interface McpServer {
  id: string;
  /** 标识，即输出中的 Server 名；在全部 MCP Server 中唯一。 */
  key: string;
  /** Claude 风格的 JSON 对象，如 `command`、`args`、`env`。 */
  content: JsonObject;
  description: string;
  tag_ids: string[];
  high_risk: boolean;
}

/** 一对输出模板，按模式是否为空选用其一。模板为空字符串表示该 Agent 表达不了。 */
export interface TemplatePair {
  with_pattern: string;
  without_pattern: string;
}

export interface BuiltInTool {
  id: string;
  /** 标识，在所属 Agent 内唯一。 */
  key: string;
  description: string;
  tag_ids: string[];
  high_risk: boolean;
  /** 写入类工具：模式为空或指向主目录、根目录时，`allow` 规则产生高危提示。 */
  writes: boolean;
  /** 模板中使用 `{pattern}`，如 `Read({pattern})` 与 `Read`。 */
  templates: TemplatePair;
}

/** Agent 读取配置的一个层级，只用于提示把输出粘贴到哪里，不影响输出内容。 */
export interface Scope {
  name: string;
  path: string;
  /** 可选说明，空字符串表示没有说明。 */
  note: string;
}

export interface PermissionOutput {
  /** 点分的属性路径，如 `permissions`、`userSettings.globalPermissionGrants`。 */
  property_path: string;
  scopes: Scope[];
  /** 决策到输出键名的映射；某一档为空字符串表示该 Agent 不支持这一档。 */
  decision_keys: Record<Decision, string>;
  /** 模板中使用 `{command}` 和 `{pattern}`，如 `Bash({command} *)`。 */
  command_templates: TemplatePair;
  /** 模板中使用 `{server}` 和 `{pattern}`，如 `mcp__{server}`。 */
  mcp_templates: TemplatePair;
}

export type McpStyle = 'json' | 'toml';

export interface McpOutput {
  style: McpStyle;
  /** 点分的属性路径，如 `mcpServers`、`mcp_servers`。 */
  property_path: string;
  scopes: Scope[];
}

/** Agent 定义：描述如何把中立规则集写成某个 Agent 的配置。 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  built_in_tools: BuiltInTool[];
  /** 为 `null` 时该 Agent 不输出权限。 */
  permission_output: PermissionOutput | null;
  /** 为 `null` 时该 Agent 不输出 MCP 配置。 */
  mcp_output: McpOutput | null;
}

/**
 * 工具引用。命令工具和 MCP 工具（即 MCP Server）的 ID 在工作区内查找；
 * 内置工具的 ID 在全部 Agent 的内置工具中查找，规则通过它隐含归属该 Agent。
 */
export interface ToolRef {
  type: ToolType;
  id: string;
}

export interface Rule {
  id: string;
  tool: ToolRef;
  /** 模式，空字符串表示整个工具。其中的 `*` 原样代入模板。 */
  pattern: string;
  decision: Decision;
  high_risk: boolean;
}

export interface Workspace {
  schema_version: typeof SCHEMA_VERSION;
  /** 最近一次修改的时间（ISO 8601），用于同步前的比较。 */
  updated_at: string;
  tags: Tag[];
  command_tools: CommandTool[];
  mcp_servers: McpServer[];
  agents: Agent[];
  rules: Rule[];
}

/** 本机设置：只属于当前设备，用于展开路径占位符。不属于工作区，也不同步。 */
export type OperatingSystem = 'linux' | 'macos' | 'windows';

export interface DeviceSettings {
  os: OperatingSystem | null;
  user_name: string;
}

export const EMPTY_DEVICE_SETTINGS: DeviceSettings = { os: null, user_name: '' };
