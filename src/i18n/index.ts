import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCN from '@/locales/zh-CN.json';

/** 界面只提供简体中文。文案仍集中在 locale 文件里，以便以后增加其他语言。 */
export const LANGUAGE = 'zh-CN';

/**
 * 在首次渲染前初始化 i18n。
 * 语言包随主脚本打包，不放在 `public/` 中用 `fetch()` 读取，因此不占用 `connect-src`。
 */
export async function setupI18n(): Promise<void> {
  await i18next.use(initReactI18next).init({
    lng: LANGUAGE,
    fallbackLng: false,
    resources: { [LANGUAGE]: { translation: zhCN } },
    interpolation: { escapeValue: false },
  });
  document.documentElement.lang = LANGUAGE;
  document.title = i18next.t('brand.name');
}
