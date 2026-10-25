/*
 * 界面语言：支持哪些语言，以及按手动选择和浏览器偏好决定显示哪一种。
 * 手动选择保存在持久化应用 store 中，`null` 表示跟随浏览器。
 */

/** 支持的界面语言，也是语言菜单中的顺序。 */
export const LANGUAGES = ['zh-CN', 'en'] as const;

export type Language = (typeof LANGUAGES)[number];

/** 源语言：文案键以它的语言文件为准。 */
export const SOURCE_LANGUAGE: Language = 'zh-CN';

/** 浏览器偏好中没有支持的语言时使用的语言。 */
export const DEFAULT_LANGUAGE: Language = 'en';

/** 各语言用自己的写法命名，语言菜单按此显示，界面是任何语言都能认出来。不是界面文案，不随语言翻译。 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  'zh-CN': '简体中文',
  en: 'English',
};

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/** 把 BCP 47 语言标签映射到支持的语言：主子标签为 `zh` 的都映射到简体中文，为 `en` 的映射到英文。 */
export function matchLanguage(tag: string): Language | null {
  const primary = tag.trim().toLowerCase().split('-')[0];
  switch (primary) {
    case 'zh':
      return 'zh-CN';
    case 'en':
      return 'en';
    default:
      return null;
  }
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
