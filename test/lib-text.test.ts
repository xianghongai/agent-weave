import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const LIB_DIR = join(import.meta.dirname, '../src/lib');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

/** 去掉注释后，找出含中文的字符串字面量（引号或模板字符串）。 */
function chineseLiterals(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const literals = code.match(/(["'`])(?:(?!\1)[^\\\n]|\\.)*\1/g) ?? [];
  return literals.filter((literal) => /[一-鿿]/.test(literal));
}

/** 允许出现的中文字面量：各语言用自己写法的名称，不随界面语言翻译，不是界面文案。 */
const ALLOWED: Record<string, string[]> = {
  'language.ts': ["'简体中文'"],
};

describe('src/lib/ 不含界面文案', () => {
  it.each(sourceFiles(LIB_DIR).map((path) => [relative(LIB_DIR, path), path]))('%s', (file, path) => {
    // 文案放在 src/locales/，纯逻辑出错时返回原因码，由界面层翻译。
    const literals = chineseLiterals(readFileSync(path, 'utf8')).filter(
      (literal) => !(ALLOWED[file] ?? []).includes(literal)
    );
    expect({ file, literals }).toEqual({ file, literals: [] });
  });
});
