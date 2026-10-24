import { type ParseError, parse } from 'jsonc-parser';

/*
 * JSONC 解析：允许注释和尾随逗号。导入工作区文件和合成预设共用同一套语法。
 * 构建插件经由预设合成导入本模块，因此只用相对路径导入（见 AGENTS.md“技术约定”）。
 */

export interface JsoncParseResult {
  /** 有语法错误时是 `jsonc-parser` 尽力解析出的值，调用方应先检查 `errors`。 */
  value: unknown;
  errors: ParseError[];
}

export function parseJsonc(text: string): JsoncParseResult {
  const errors: ParseError[] = [];
  const value: unknown = parse(text, errors, { allowTrailingComma: true });
  return { value, errors };
}
