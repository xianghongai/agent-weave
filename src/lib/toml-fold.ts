/*
 * TOML 预览的折叠范围。TOML 用的是没有语法树的旧式语言模式，不能按语法折叠，改为按表折叠：
 * 一个表从表头（`[...]` 或 `[[...]]`）开始，到下一个表头之前为止。
 */

function isTableHeader(line: string): boolean {
  return line.trimStart().startsWith('[');
}

/**
 * 第 `index` 行（从 0 开始）是表头时，返回这个表最后一个非空行的下标，折叠从表头行末到这一行。
 * 不是表头，或表里没有内容时返回 `null`。
 */
export function tomlTableFoldEnd(lines: readonly string[], index: number): number | null {
  const header = lines[index];
  if (header === undefined || !isTableHeader(header)) {
    return null;
  }
  let end: number | null = null;
  for (let i = index + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (isTableHeader(line)) {
      break;
    }
    if (line.trim() !== '') {
      end = i;
    }
  }
  return end;
}
