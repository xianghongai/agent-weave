/*
 * 界面语言：支持哪些语言，以及按手动选择和浏览器偏好决定显示哪一种。
 * 手动选择保存在持久化应用 store 中，`null` 表示跟随浏览器。
 */

/** 支持的界面语言，也是语言菜单中的顺序。 */
export const LANGUAGES = ['zh-CN', 'en'] as const;

export type Language = (typeof LANGUAGES)[number];

/** 浏览器偏好中没有支持的语言时使用的语言。 */
export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/** 语言标签的主子标签，小写。 */
function primarySubtag(tag: string): string {
  return tag.trim().toLowerCase().split('-')[0] ?? '';
}

/**
 * 把 BCP 47 语言标签映射到支持的语言：按主子标签匹配，不区分地区和书写系统，
 * 如 `zh-TW` 映射到简体中文、`en-GB` 映射到英文。
 */
export function matchLanguage(tag: string): Language | null {
  const primary = primarySubtag(tag);
  return LANGUAGES.find((language) => primarySubtag(language) === primary) ?? null;
}

/** 决定显示的语言：合法的手动选择优先，其次按顺序取浏览器偏好中第一个能匹配的，最后用兜底语言。 */
export function resolveLanguage(chosen: string | null, preferred: readonly string[]): Language {
  if (isLanguage(chosen)) {
    return chosen;
  }
  for (const tag of preferred) {
    const match = matchLanguage(tag);
    if (match !== null) {
      return match;
    }
  }
  return DEFAULT_LANGUAGE;
}
