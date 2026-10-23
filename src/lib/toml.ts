import type { JsonObject, JsonValue } from '@/lib/workspace';

/*
 * 把 JSON 对象转换成 TOML 表，供 TOML 风格的 MCP 输出使用。
 * 纯函数，不依赖第三方库；只覆盖 MCP Server 内容会用到的 JSON 结构。
 */

export interface TomlTable {
  /** 以表头开始的 TOML 文本，末尾不带换行。 */
  text: string;
  /** 无法表达而被跳过的字段，以相对内容根的点分键路径表示，如 `env.TOKEN`。 */
  skippedFields: string[];
}

const SHORT_ESCAPES: Record<string, string> = {
  '"': '\\"',
  '\\': '\\\\',
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\f': '\\f',
  '\r': '\\r',
};

/** TOML 基本字符串：转义引号、反斜杠和全部控制字符（含 U+007F），其余字符原样保留。 */
function tomlString(text: string): string {
  // eslint-disable-next-line no-control-regex -- 控制字符正是要转义的对象。
  const escaped = text.replace(/["\\\u0000-\u001f\u007f]/g, (char) => {
    return SHORT_ESCAPES[char] ?? `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
  });
  return `"${escaped}"`;
}

/** 只含字母、数字、`_`、`-` 的键可以作裸键，其余加引号。 */
function tomlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : tomlString(key);
}

/** 把值写成 TOML 行内形式；对象写成行内表。值中含 `null` 时无法表达，返回 `null`。 */
function inlineValue(value: JsonValue): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return tomlString(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  const parts = Array.isArray(value)
    ? value.map(inlineValue)
    : Object.entries(value).map(([key, item]) => {
        const text = inlineValue(item);
        return text === null ? null : `${tomlKey(key)} = ${text}`;
      });
  if (parts.some((part) => part === null)) {
    return null;
  }
  if (Array.isArray(value)) {
    return `[${parts.join(', ')}]`;
  }
  return parts.length === 0 ? '{}' : `{ ${parts.join(', ')} }`;
}

function isObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 把对象写成一个表；嵌套对象写成其后的子表。
 * TOML 要求表的键值对写在任何子表之前，因此先写非对象的值，再按原顺序写子表。
 * 无法表达的字段不写入，把它相对内容根的点分路径记入 `skippedFields`。
 */
function tableBlocks(header: string[], field: string[], content: JsonObject, skippedFields: string[]): string[] {
  const lines = [`[${header.join('.')}]`];
  const subtables: [string, JsonObject][] = [];
  for (const [key, value] of Object.entries(content)) {
    if (isObject(value)) {
      subtables.push([key, value]);
      continue;
    }
    const text = inlineValue(value);
    if (text === null) {
      skippedFields.push([...field, tomlKey(key)].join('.'));
    } else {
      lines.push(`${tomlKey(key)} = ${text}`);
    }
  }
  const blocks = subtables.flatMap(([key, value]) =>
    tableBlocks([...header, tomlKey(key)], [...field, tomlKey(key)], value, skippedFields)
  );
  return [lines.join('\n'), ...blocks];
}

/**
 * 把对象写成 `[<表路径>]` 表及其子表，表与表之间以空行分隔。
 * `null` 无法用 TOML 表达：对象中的 `null` 字段被跳过；数组（含其中的行内表）里出现 `null` 时整个数组跳过。
 */
export function tomlTable(path: string[], content: JsonObject): TomlTable {
  const skippedFields: string[] = [];
  const text = tableBlocks(path.map(tomlKey), [], content, skippedFields).join('\n\n');
  return { text, skippedFields };
}
