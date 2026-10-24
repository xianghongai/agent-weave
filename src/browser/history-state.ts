/*
 * 跨页面的一次性意图通过 `history.state` 传递，见 `docs/adr/0002-state-layering.md`。
 * 跳转时用 wouter 的 `<Link state={...}>` 写入，目标页面在初始化 `useState` 时读取。
 * 浏览器后退或前进回到这条记录时，页面重新挂载，再次读到同一份 state。
 */

import { TOOL_TYPES, type ToolRef } from '@/lib/workspace';

/** 从标签页跳到工具页或 MCP Server 页时带上的 state。 */
export interface TagFilterState {
  tagId: string;
}

/** 读取当前历史记录 state 中的一个字段；state 不是对象或没有这个字段时返回 `undefined`。 */
function readHistoryField<State>(key: keyof State & string): unknown {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null && key in state ? Reflect.get(state, key) : undefined;
}

/** 读取当前历史记录 state 中的标签 ID；没有或形状不对时返回 `null`。不检查标签是否存在。 */
export function readTagIdFromHistory(): string | null {
  const tagId = readHistoryField<TagFilterState>('tagId');
  return typeof tagId === 'string' ? tagId : null;
}

/** 从工具列表点击规则数跳到规则页时带上的 state。 */
export interface ToolRuleFilterState {
  tool: ToolRef;
}

/** 读取当前历史记录 state 中的工具引用；没有或形状不对时返回 `null`。不检查工具是否存在。 */
export function readToolRefFromHistory(): ToolRef | null {
  const tool = readHistoryField<ToolRuleFilterState>('tool');
  if (typeof tool !== 'object' || tool === null || !('type' in tool) || !('id' in tool)) {
    return null;
  }
  const type = TOOL_TYPES.find((candidate) => candidate === tool.type);
  return type && typeof tool.id === 'string' ? { type, id: tool.id } : null;
}
