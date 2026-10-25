import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { interfaceLanguage } from '@/browser/browser-languages';
import { DEFAULT_LANGUAGE, LANGUAGES, type Language, isLanguage, matchLanguage } from '@/lib/language';
import { useAppStore } from '@/state/app-store';

/** 各语言的结构略有不同（英文多出复数形式），键是否一致由 `pnpm test` 检查。 */
type Messages = Record<string, unknown>;

/**
 * 每种语言打包成独立的带哈希脚本，显示时才加载，首屏只加载当前语言。
 * 不放在 `public/` 中用 `fetch()` 读取：那样要占用 `connect-src`，而它只放行 `'self'` 和 GitHub API；
 * 动态 `import()` 的脚本属于 `script-src 'self'`，并且由 PWA 预缓存，离线也能切换。
 */
const LOADERS: Record<Language, () => Promise<{ default: Messages }>> = {
  'zh-CN': () => import('@/locales/zh-CN.json'),
  en: () => import('@/locales/en.json'),
};

async function ensureLoaded(language: Language): Promise<void> {
  if (!i18next.hasResourceBundle(language, 'translation')) {
    const { default: messages } = await LOADERS[language]();
    i18next.addResourceBundle(language, 'translation', messages);
  }
}

/** `<html lang>` 跟随界面语言，屏幕阅读器按它朗读；页面标题取当前语言的品牌名。 */
function applyToDocument(language: Language): void {
  document.documentElement.lang = language;
  document.title = i18next.t('brand.name');
}

/**
 * 在首次渲染前初始化 i18n。应用 store 在模块加载时就已从本地存储恢复，
 * 这里读其中手动选择的语言，与恢复时决定预设语言用同一个 `interfaceLanguage()`，两边一致。
 */
export async function setupI18n(): Promise<void> {
  const language = interfaceLanguage(useAppStore.getState().language);
  const { default: messages } = await LOADERS[language]();
  await i18next.use(initReactI18next).init({
    lng: language,
    // 只加载了当前语言，没有可回退的语言；缺键由 `pnpm test` 拦截。
    fallbackLng: false,
    supportedLngs: [...LANGUAGES],
    load: 'currentOnly',
    resources: { [language]: { translation: messages } },
    // 其他语言在切换时才加入。
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
  });
  applyToDocument(language);
}

/**
 * 加载并切换到另一种界面语言，把选择保存在本机。选的和浏览器语言相同时也照存，之后不再跟随浏览器。
 * 语言包加载失败（如尚未预缓存时离线）时抛出，界面保持原来的语言，由调用方提示。
 */
export async function switchLanguage(language: Language): Promise<void> {
  await ensureLoaded(language);
  await i18next.changeLanguage(language);
  applyToDocument(language);
  useAppStore.getState().setLanguage(language);
}

/** 把 i18next 的语言标签对应到界面语言。正常情况下就是初始化或切换时给的语言，对不上时用兜底语言。 */
export function toLanguage(tag: string): Language {
  return isLanguage(tag) ? tag : (matchLanguage(tag) ?? DEFAULT_LANGUAGE);
}

/** 当前显示的界面语言，供 `Intl` 格式化和按语言取预设使用。组件中用 `useTranslation()` 的 `i18n.language`，语言切换后才会重新渲染。 */
export function currentLanguage(): Language {
  return toLanguage(i18next.language);
}
