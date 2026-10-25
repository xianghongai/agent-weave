import 'i18next';

import type messages from '@/locales/zh-CN.json';

// 文案键以 zh-CN 为准，`t()` 引用不存在的键时类型检查会报错。
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof messages };
  }
}
