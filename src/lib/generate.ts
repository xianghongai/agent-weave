import type {
  Decision,
  DeviceSettings,
  JsonValue,
  McpStyle,
  PermissionOutput,
  Scope,
  Workspace,
} from '@/lib/workspace';
import { DECISIONS } from '@/lib/workspace';
import { listRules } from '@/lib/workspace-operations';

/*
 * 生成：输入工作区、Agent 的内部 ID 和本机设置，返回该 Agent 的完整输出结果。
 * 界面只负责展示这里的结果；模板代入、去重、排序等都是内部实现，不单独暴露。
 */

/** 权限节中一个决策的输出。 */
export interface DecisionOutput {
  decision: Decision;
  /** 该决策在输出中的键名，来自 Agent 定义的决策键名映射。 */
  key: string;
  /** 已代入模板并去重的条目，顺序与规则列表一致。 */
  entries: string[];
  /** “复制内部”文本：数组元素以逗号和换行分隔，不带方括号。 */
  copyInnerText: string;
}

export interface PermissionSection {
  /** 按属性路径完整嵌套的 JSON。 */
  preview: string;
  /** “复制”文本：属性路径最末一段的键值对，不带外层花括号。 */
  copyText: string;
  /** 只包含该 Agent 支持的决策，按 `allow`、`ask`、`deny` 排列。 */
  decisions: DecisionOutput[];
  scopes: Scope[];
}

export interface McpSection {
  style: McpStyle;
  preview: string;
  copyText: string;
  /** 只有 JSON 风格提供“复制内部”。 */
  copyInnerText: string | null;
  scopes: Scope[];
}

export type SkipReason = 'decisionKeyMissing' | 'templateMissing';

/** 跳过的规则：该 Agent 定义表达不了、因而没有写进输出的权限规则。 */
export interface SkippedRule {
  ruleId: string;
  reason: SkipReason;
}

export type Notice =
  | { type: 'highRisk'; ruleId: string }
  | { type: 'conflict'; ruleIds: string[] }
  | { type: 'placeholderUnexpanded'; ruleId: string | null; serverId: string | null }
  | { type: 'tomlFieldSkipped'; serverId: string; field: string };

export interface AgentOutput {
  /** 为 `null` 时该 Agent 不输出权限。 */
  permission: PermissionSection | null;
  /** 为 `null` 时该 Agent 不输出 MCP 配置。 */
  mcp: McpSection | null;
  skippedRules: SkippedRule[];
  notices: Notice[];
}

type TemplateValues = Partial<Record<'command' | 'server' | 'pattern', string>>;

/**
 * 一次性替换模板中的 `{command}`、`{server}`、`{pattern}`。
 * 代入的值不会再被扫描，因此模式中的 `*` 或花括号都原样保留。
 */
function fillTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\{(command|server|pattern)\}/g, (placeholder, name: keyof TemplateValues) => {
    return values[name] ?? placeholder;
  });
}

const INDENT = 2;

/** 把值按点分属性路径层层嵌套，返回完整预览和最末一段的键值对。 */
function nestedJson(propertyPath: string, value: JsonValue): { preview: string; copyText: string } {
  const segments = propertyPath.split('.');
  const lastKey = segments.at(-1) ?? '';
  const nested = segments.reduceRight<JsonValue>((inner, segment) => ({ [segment]: inner }), value);
  return {
    preview: JSON.stringify(nested, null, INDENT),
    copyText: `${JSON.stringify(lastKey)}: ${JSON.stringify(value, null, INDENT)}`,
  };
}

function permissionSection(workspace: Workspace, output: PermissionOutput): PermissionSection {
  const rules = listRules(workspace);
  const decisions: DecisionOutput[] = DECISIONS.map((decision) => {
    // Set 保持插入顺序，因此去重后仍与规则列表的顺序一致。
    const entries = new Set<string>();
    for (const { rule, tool } of rules) {
      if (rule.decision !== decision) {
        continue;
      }
      const template =
        rule.pattern === '' ? output.command_templates.without_pattern : output.command_templates.with_pattern;
      entries.add(fillTemplate(template, { command: tool.tool.key, pattern: rule.pattern }));
    }
    const list = [...entries];
    return {
      decision,
      key: output.decision_keys[decision],
      entries: list,
      copyInnerText: list.map((entry) => JSON.stringify(entry)).join(',\n'),
    };
  });

  const body = Object.fromEntries(decisions.map(({ key, entries }) => [key, entries]));
  return { ...nestedJson(output.property_path, body), decisions, scopes: output.scopes };
}

/** 找不到该 Agent 时返回 `null`。 */
export function generate(workspace: Workspace, agentId: string, _device: DeviceSettings): AgentOutput | null {
  const agent = workspace.agents.find((candidate) => candidate.id === agentId);
  if (!agent) {
    return null;
  }
  return {
    permission: agent.permission_output ? permissionSection(workspace, agent.permission_output) : null,
    // MCP 节随 MCP Server 一起实现，在此之前不输出。
    mcp: null,
    skippedRules: [],
    notices: [],
  };
}
