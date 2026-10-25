import { type Language, resolveLanguage } from '@/lib/language';

/** 浏览器的语言偏好，按偏好顺序排列。有的浏览器 `navigator.languages` 为空，这时只用 `navigator.language`。 */
function browserLanguages(): readonly string[] {
  return navigator.languages.length > 0 ? navigator.languages : [navigator.language];
}

/**
 * 按手动选择决定界面语言，`null` 表示跟随浏览器。
 * 恢复本地存储时用它决定回退预设的语言，i18n 初始化时用它决定显示的语言，两边用同一个函数，语言一致。
 */
export function interfaceLanguage(chosen: Language | null): Language {
  return resolveLanguage(chosen, browserLanguages());
}
