import { createStore } from '@/state/create-store';

export type Theme = 'dark' | 'light';

/*
 * 主题记录在 <html class="dark"> 上，页面默认带着它，即默认深色。
 * 选择暂不持久化，刷新后回到深色。
 */

const store = createStore<Theme>(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  store.set(theme);
}

export function useTheme(): Theme {
  return store.use((theme) => theme);
}
