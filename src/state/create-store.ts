import { useSyncExternalStore } from 'react';

/*
 * 各个内存状态共用的最小外部 store：保存一个值，替换时通知订阅者。
 * 界面通过 `use(select)` 订阅其中的一部分；`select` 只能取出已有的值，不能每次构造新对象，否则会反复渲染。
 */

export interface Store<T> {
  get(): T;
  /** 替换整个值并通知订阅者。 */
  set(next: T): void;
  subscribe(listener: () => void): () => void;
  /** React Hook：订阅值中由 `select` 取出的部分。 */
  use<S>(select: (state: T) => S): S;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  const store: Store<T> = {
    get: () => state,
    set(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    use: (select) => useSyncExternalStore(store.subscribe, () => select(state)),
  };
  return store;
}
