import { compiler } from 'markdown-to-jsx/html';
import { describe, expect, it } from 'vitest';

import { escapeMarkdown } from '@/lib/markdown';

/** 与 `src/components/markdown.tsx` 相同的解析选项，渲染成 HTML 便于断言。 */
function render(markdown: string): string {
  return compiler(markdown, { disableParsingRawHTML: true, forceWrapper: true, wrapper: 'div' });
}

describe('escapeMarkdown', () => {
  it('插进文案的链接写法显示为原文', () => {
    expect(render(`该规则只属于 ${escapeMarkdown('[x](http://a)')}。`)).toBe('<div>该规则只属于 [x](http://a)。</div>');
  });

  it.each([
    ['强调', '*a* _b_ **c**', '*a* _b_ **c**'],
    ['行内代码', '`npm`', '`npm`'],
    ['反斜杠', 'C:\\Users\\', 'C:\\Users\\'],
    ['图片', '![x](http://a/x.png)', '![x](http://a/x.png)'],
    ['自动链接', '<http://a>', '&lt;http://a&gt;'],
    ['删除线', '~~x~~', '~~x~~'],
  ])('%s显示为原文', (_, text, html) => {
    expect(render(`名称 ${escapeMarkdown(text)} 结束`)).toBe(`<div>名称 ${html} 结束</div>`);
  });

  it('在行首也不变成标题或列表', () => {
    expect(render(escapeMarkdown('# a'))).toBe('<div># a</div>');
    expect(render(escapeMarkdown('- a'))).toBe('<div>- a</div>');
    expect(render(escapeMarkdown('1. a'))).toBe('<div>1. a</div>');
  });

  it('不含特殊字符的文字保持不变', () => {
    expect(escapeMarkdown('Claude Code 中文 123')).toBe('Claude Code 中文 123');
  });
});
