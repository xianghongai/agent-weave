import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

/*
 * 主题记录在 <html class="dark"> 上，页面默认带着它，即默认深色。
 * 选择暂不持久化，刷新后回到深色。
 */

const listeners = new Set<() => void>();

function current(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, current);
}
