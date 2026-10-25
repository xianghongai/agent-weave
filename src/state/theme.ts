import type { Theme } from '@/lib/persistence';
import { useAppStore } from '@/state/app-store';

/*
 * 主题记录在 <html class="dark"> 上，页面默认带着它，即默认深色。
 * 选择保存在应用 store 中并持久化；这里订阅 store，启动时恢复上次的选择，之后随 store 同步 class。
 * CSP 禁止内联脚本，选了浅色的用户打开页面时会先看到一下深色。
 */

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/** 把应用 store 中的主题同步到 `<html>` 的 `dark` class。在首次渲染前调用一次。 */
export function syncThemeToDocument(): void {
  applyTheme(useAppStore.getState().theme);
  useAppStore.subscribe((state, previous) => {
    if (state.theme !== previous.theme) {
      applyTheme(state.theme);
    }
  });
}
