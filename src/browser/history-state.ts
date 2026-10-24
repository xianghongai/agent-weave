/*
 * 跨页面的一次性意图通过 `history.state` 传递，见 `docs/adr/0002-state-layering.md`。
 * 跳转时用 wouter 的 `<Link state={...}>` 写入，目标页面在初始化 `useState` 时读取。
 * 浏览器后退或前进回到这条记录时，页面重新挂载，再次读到同一份 state。
 */

/** 从标签页跳到工具页或 MCP Server 页时带上的 state。 */
export interface TagFilterState {
  tagId: string;
}

/** 读取当前历史记录 state 中的标签 ID；没有或形状不对时返回 `null`。不检查标签是否存在。 */
export function readTagIdFromHistory(): string | null {
  const state: unknown = window.history.state;
  if (typeof state !== 'object' || state === null || !('tagId' in state)) {
    return null;
  }
  return typeof state.tagId === 'string' ? state.tagId : null;
}
