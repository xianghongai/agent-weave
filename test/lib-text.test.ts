import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const LIB_DIR = join(import.meta.dirname, '../src/lib');

/** 预设是随站点发布的数据，名称、描述和作用域说明本来就是中文，不算界面文案。 */
const DATA_DIRS = ['presets'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return DATA_DIRS.includes(relative(LIB_DIR, path)) ? [] : sourceFiles(path);
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

describe('src/lib/ 不含界面文案', () => {
  it.each(sourceFiles(LIB_DIR).map((path) => [relative(LIB_DIR, path), path]))('%s', (file, path) => {
    // 文案放在 src/locales/，纯逻辑出错时返回原因码，由界面层翻译。
    expect({ file, literals: chineseLiterals(readFileSync(path, 'utf8')) }).toEqual({ file, literals: [] });
  });
});
