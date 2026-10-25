import { describe, expect, it } from 'vitest';

import { LANGUAGES, matchLanguage, resolveLanguage } from '@/lib/language';

describe('语言：把浏览器语言标签映射到界面语言', () => {
  it('中文不论地区和书写系统都映射到简体中文', () => {
    expect(matchLanguage('zh')).toBe('zh-CN');
    expect(matchLanguage('zh-CN')).toBe('zh-CN');
    expect(matchLanguage('zh-TW')).toBe('zh-CN');
    expect(matchLanguage('zh-Hant-HK')).toBe('zh-CN');
  });

  it('英文按主子标签匹配，不区分大小写', () => {
    expect(matchLanguage('en-US')).toBe('en');
    expect(matchLanguage('EN')).toBe('en');
  });

  it('忽略首尾空白', () => {
    expect(matchLanguage(' zh-CN ')).toBe('zh-CN');
    expect(matchLanguage(' en ')).toBe('en');
  });

  it.each(LANGUAGES)('支持的语言 %s 匹配到自己', (language) => {
    expect(matchLanguage(language)).toBe(language);
  });

  it('其他语言不匹配', () => {
    expect(matchLanguage('ja')).toBeNull();
    expect(matchLanguage('fr-FR')).toBeNull();
  });
});

describe('语言：决定显示哪种界面语言', () => {
  it('手动选择的语言优先，即使浏览器偏好另一种', () => {
    expect(resolveLanguage('en', ['zh-CN'])).toBe('en');
    expect(resolveLanguage('zh-CN', ['en-US'])).toBe('zh-CN');
  });

  it('忽略无效的手动选择，按浏览器偏好的顺序取第一个能匹配的', () => {
    expect(resolveLanguage('ja', ['ja-JP', 'en-US', 'zh-CN'])).toBe('en');
    expect(resolveLanguage(null, ['fr', 'zh-TW', 'en'])).toBe('zh-CN');
  });

  it('都不匹配或没有偏好时用英文', () => {
    expect(resolveLanguage(null, ['ja', 'fr'])).toBe('en');
    expect(resolveLanguage(null, [])).toBe('en');
  });
});
