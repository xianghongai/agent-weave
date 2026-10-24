import { printParseErrorCode } from 'jsonc-parser';

import { parseJsonc } from './jsonc';

import { SCHEMA_VERSION, WORKSPACE_ARRAY_KEYS, type Workspace, type WorkspaceArrayKey } from './workspace';
import { type WorkspaceProblem, parseWorkspace } from './workspace-validation';

/*
 * 预设合成：把 `presets/` 下手写的 JSONC 文件合成一份工作区，见 ADR 0004。
 * 每个文件都是一份部分工作区，顶层键与导出文件相同；合成时依次拼接同名数组，
 * 先是根目录下的文件，再是按优先级排好序的 Agent 文件，最后把文案键替换成语言文件中的文字。
 * 只处理文本，不读文件系统，读文件由调用方（构建插件、测试）负责。
 * 构建插件在加载 Vite 配置时导入本模块，那时 `@/` 别名还不可用，因此本模块及其依赖用相对路径导入，由 lint 检查。
 */

/** 一个预设文件或语言文件。`path` 相对预设目录，用 `/` 分隔，如 `agents/claude-code.jsonc`。 */
export interface PresetFile {
  path: string;
  text: string;
}

/** 语法错误，行列从 1 开始。`code` 是 `jsonc-parser` 的错误名，如 `CommaExpected`。 */
export interface PresetSyntaxError {
  path: string;
  line: number;
  column: number;
  code: string;
}

/**
 * 合成时发现的逻辑问题，不影响合成出结果：
 * - `invalidFile`：文件顶层不是对象，或顶层键 `key` 不是已知的键、取值类型不对（语言文件的值不是字符串）；
 * - `invalidWorkspace`：合成结果没有通过与导入相同的校验，`entryId` 见 `WorkspaceFailure`；
 * - `missingMessage`：条目引用的文案键 `key` 不在语言文件中，结果中保留键本身；
 * - `unusedMessage`：语言文件中的键 `key` 没有被任何条目使用。
 */
export type PresetWarning =
  | { kind: 'invalidFile'; path: string; key?: string }
  | { kind: 'invalidWorkspace'; problem: WorkspaceProblem; entryId?: string }
  | { kind: 'missingMessage'; key: string }
  | { kind: 'unusedMessage'; key: string };

/**
 * 有语法错误时只返回语法错误。否则返回合成结果和警告；
 * 结果没有通过校验时（警告中有 `invalidWorkspace`），`workspace` 是未经校验的合成结果，只保证能序列化。
 */
export type PresetCompositionResult =
  | { workspace: Workspace; warnings: PresetWarning[] }
  | { syntaxErrors: PresetSyntaxError[] };

/** 预设的修改时间固定不变，用户的任何一次编辑都会比它新。这是逻辑而不是数据，不写在预设文件中。 */
const PRESET_UPDATED_AT = '2026-10-23T00:00:00.000Z';

type Arrays = Record<WorkspaceArrayKey, unknown[]>;

/** Agent 文件所在的子目录，只有其中的文件可以声明 `priority`。 */
const AGENT_DIR = 'agents/';

/** 根目录下的文件按这个顺序拼接，其余根目录文件按文件名排在后面。 */
const ROOT_FILE_ORDER = ['tags.jsonc', 'command-tools.jsonc', 'mcp-servers.jsonc', 'rules.jsonc'];

interface ParsedFile {
  path: string;
  value: unknown;
}

/**
 * 合成预设。`files` 是全部预设数据文件（不含语言文件），顺序不影响结果；`locale` 是语言文件，
 * 顶层是“文案键 → 文字”的对象。不抛异常。
 */
export function composePresets(files: readonly PresetFile[], locale: PresetFile): PresetCompositionResult {
  const syntaxErrors: PresetSyntaxError[] = [];
  const parse = (file: PresetFile): ParsedFile => ({ path: file.path, value: parseText(file, syntaxErrors) });
  const parsed = files.map(parse);
  const parsedLocale = parse(locale);
  if (syntaxErrors.length > 0) {
    return { syntaxErrors };
  }

  const warnings: PresetWarning[] = [];
  const arrays = Object.fromEntries(WORKSPACE_ARRAY_KEYS.map((key) => [key, [] as unknown[]])) as Arrays;
  for (const file of order(parsed, warnings)) {
    collect(file, arrays, warnings);
  }

  const messages = readMessages(parsedLocale, warnings);
  const used = new Set<string>();
  translateEntries(arrays, (key) => {
    used.add(key);
    const text = messages.get(key);
    if (text === undefined) {
      warnings.push({ kind: 'missingMessage', key });
      return key;
    }
    return text;
  });
  for (const key of messages.keys()) {
    if (!used.has(key)) {
      warnings.push({ kind: 'unusedMessage', key });
    }
  }

  const composed = { schema_version: SCHEMA_VERSION, updated_at: PRESET_UPDATED_AT, ...arrays };
  const result = parseWorkspace(composed);
  if ('workspace' in result) {
    return { workspace: result.workspace, warnings };
  }
  warnings.push({ kind: 'invalidWorkspace', ...result });
  return { workspace: composed as unknown as Workspace, warnings };
}

function parseText(file: PresetFile, syntaxErrors: PresetSyntaxError[]): unknown {
  const { value, errors } = parseJsonc(file.text);
  for (const error of errors) {
    syntaxErrors.push({
      path: file.path,
      ...lineAndColumn(file.text, error.offset),
      code: printParseErrorCode(error.error),
    });
  }
  return value;
}

function lineAndColumn(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset).split('\n');
  return { line: before.length, column: (before.at(-1)?.length ?? 0) + 1 };
}

/** 根目录下的文件在前，按固定顺序；Agent 文件在后，按 `priority` 降序、同值按路径升序。 */
function order(files: readonly ParsedFile[], warnings: PresetWarning[]): ParsedFile[] {
  const roots = files.filter((file) => !file.path.startsWith(AGENT_DIR));
  const agents = files
    .filter((file) => file.path.startsWith(AGENT_DIR))
    .map((file) => ({ file, priority: priorityOf(file, warnings) }));
  return [
    ...roots.toSorted((a, b) => rootRank(a.path) - rootRank(b.path) || compare(a.path, b.path)),
    ...agents.toSorted((a, b) => b.priority - a.priority || compare(a.file.path, b.file.path)).map(({ file }) => file),
  ];
}

function rootRank(path: string): number {
  const index = ROOT_FILE_ORDER.indexOf(path);
  return index === -1 ? ROOT_FILE_ORDER.length : index;
}

function priorityOf({ path, value }: ParsedFile, warnings: PresetWarning[]): number {
  if (!isRecord(value) || value.priority === undefined) {
    return 0;
  }
  if (!Number.isInteger(value.priority)) {
    warnings.push({ kind: 'invalidFile', path, key: 'priority' });
    return 0;
  }
  return Number(value.priority);
}

/** 把一个文件中的数组追加到合成结果中。`priority` 已在排序时读取，不进入结果。 */
function collect({ path, value }: ParsedFile, arrays: Arrays, warnings: PresetWarning[]): void {
  if (!isRecord(value)) {
    warnings.push({ kind: 'invalidFile', path });
    return;
  }
  for (const [key, entries] of Object.entries(value)) {
    if (key === 'priority' && path.startsWith(AGENT_DIR)) {
      continue;
    }
    if (!isArrayKey(key) || !Array.isArray(entries)) {
      warnings.push({ kind: 'invalidFile', path, key });
      continue;
    }
    arrays[key].push(...entries);
  }
}

function isArrayKey(key: string): key is WorkspaceArrayKey {
  return (WORKSPACE_ARRAY_KEYS as readonly string[]).includes(key);
}

function readMessages({ path, value }: ParsedFile, warnings: PresetWarning[]): Map<string, string> {
  const messages = new Map<string, string>();
  if (!isRecord(value)) {
    warnings.push({ kind: 'invalidFile', path });
    return messages;
  }
  for (const [key, text] of Object.entries(value)) {
    if (typeof text === 'string') {
      messages.set(key, text);
    } else {
      warnings.push({ kind: 'invalidFile', path, key });
    }
  }
  return messages;
}

/**
 * 把条目中给人看的文字从文案键替换成文字：标签名、各条目的描述、高危说明、Agent 描述、作用域的名称和说明、规则描述。
 * 空字符串表示没有文字，不当作键。结构不对的条目原样跳过，留给校验报告。
 */
function translateEntries(arrays: Arrays, translate: (key: string) => string): void {
  const fields = (entry: unknown, ...keys: string[]) => {
    if (!isRecord(entry)) {
      return;
    }
    for (const key of keys) {
      const value = entry[key];
      if (typeof value === 'string' && value !== '') {
        entry[key] = translate(value);
      }
    }
  };
  /** 命令工具、MCP Server、内置工具与规则共有的两个字段：描述与高危说明。 */
  const describedEntries = (entries: unknown) => {
    for (const entry of asArray(entries)) {
      fields(entry, 'description', 'high_risk_reason');
    }
  };
  for (const tag of arrays.tags) {
    fields(tag, 'name');
  }
  describedEntries(arrays.command_tools);
  describedEntries(arrays.mcp_servers);
  describedEntries(arrays.rules);
  for (const agent of arrays.agents) {
    if (!isRecord(agent)) {
      continue;
    }
    fields(agent, 'description');
    describedEntries(agent.built_in_tools);
    for (const output of [agent.permission_output, agent.mcp_output]) {
      for (const scope of isRecord(output) ? asArray(output.scopes) : []) {
        fields(scope, 'name', 'note');
      }
    }
  }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
