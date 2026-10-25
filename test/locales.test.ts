import { describe, expect, it } from 'vitest';

import en from '@/locales/en.json';
import zhCN from '@/locales/zh-CN.json';

/*
 * 界面语言包的一致性：简体中文是键的正本，其他语言缺键、多键、丢了插值变量或留空时，
 * 运行时会显示键名或残缺的句子，因为 i18n 不回退到其他语言。
 */

type Messages = { [key: string]: string | Messages };

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** 展平为 `a.b.c` 形式的键，复数形式合并到去掉后缀的键下。 */
function flatten(messages: Messages, prefix = ''): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') {
      const base = path.replace(PLURAL_SUFFIX, '');
      out.set(base, [...(out.get(base) ?? []), value]);
    } else {
      for (const [inner, texts] of flatten(value, path)) {
        out.set(inner, [...(out.get(inner) ?? []), ...texts]);
      }
    }
  }
  return out;
}

/** 译文必须保留的插值变量。 */
function variables(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]!).toSorted();
}

const source = flatten(zhCN);
const translations: Record<string, Messages> = { en };

describe.each(Object.entries(translations))('界面语言包 %s', (_, messages) => {
  const flat = flatten(messages);

  it('合并复数形式后，键与简体中文完全相同', () => {
    expect([...flat.keys()].toSorted()).toEqual([...source.keys()].toSorted());
  });

  it('每段文字的插值变量与简体中文一致', () => {
    for (const [key, texts] of flat) {
      const expected = variables(source.get(key)?.[0] ?? '');
      for (const text of texts) {
        expect({ key, variables: variables(text) }).toEqual({ key, variables: expected });
      }
    }
  });

  it('没有空文案', () => {
    for (const [key, texts] of flat) {
      expect({ key, empty: texts.some((text) => text.trim() === '') }).toEqual({ key, empty: false });
    }
  });
});
