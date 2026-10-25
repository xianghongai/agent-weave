import type { Language } from '@/lib/language';

/** 各语言用自己的写法命名，语言菜单按此显示，界面是任何语言都能认出来。不随界面语言翻译，所以不放在语言文件中。 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  'zh-CN': '简体中文',
  en: 'English',
};
