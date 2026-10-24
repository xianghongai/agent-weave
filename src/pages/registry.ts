import {
  BotIcon,
  FileCodeIcon,
  type LucideIcon,
  PlugIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TagsIcon,
  WrenchIcon,
} from 'lucide-react';
import { type ComponentType, type LazyExoticComponent, lazy } from 'react';

import type { ToolType } from '@/lib/workspace';

export interface PageEntry {
  /** 同时决定 locale 文件中的文案键：`pages.<id>.title`、`pages.<id>.description`。 */
  id: 'rules' | 'tools' | 'mcp' | 'tags' | 'agents' | 'output' | 'sync';
  /** hash 路由，例如 `#/rules`。 */
  path: string;
  icon: LucideIcon;
  component: LazyExoticComponent<ComponentType>;
}

/**
 * 顶部导航中的全部页面，按导航顺序排列；第一项也是首页。
 * 新增页面时在 `src/pages/` 下建目录，再在这里登记。
 */
export const PAGES: readonly PageEntry[] = [
  { id: 'rules', path: '/rules', icon: ShieldCheckIcon, component: lazy(() => import('@/pages/rules/rules-page')) },
  { id: 'tools', path: '/tools', icon: WrenchIcon, component: lazy(() => import('@/pages/tools/tools-page')) },
  { id: 'mcp', path: '/mcp', icon: PlugIcon, component: lazy(() => import('@/pages/mcp/mcp-page')) },
  { id: 'tags', path: '/tags', icon: TagsIcon, component: lazy(() => import('@/pages/tags/tags-page')) },
  { id: 'agents', path: '/agents', icon: BotIcon, component: lazy(() => import('@/pages/agents/agents-page')) },
  { id: 'output', path: '/output', icon: FileCodeIcon, component: lazy(() => import('@/pages/output/output-page')) },
  { id: 'sync', path: '/sync', icon: RefreshCwIcon, component: lazy(() => import('@/pages/sync/sync-page')) },
];

/** 列出各类工具的页面；内置工具分散在各 Agent 中，没有对应的列表页。新增工具类型时在这里补上。 */
const TOOL_LIST_PAGES = {
  command: 'tools',
  mcp: 'mcp',
  built_in: null,
} as const satisfies Record<ToolType, PageEntry['id'] | null>;

/** 有列表页的工具类型。 */
export type ListedToolType = {
  [Type in ToolType]: (typeof TOOL_LIST_PAGES)[Type] extends null ? never : Type;
}[ToolType];

export function hasToolListPage(type: ToolType): type is ListedToolType {
  return TOOL_LIST_PAGES[type] !== null;
}

/** 列出某类工具的页面路径，取自上面登记的页面。 */
export function toolListPath(type: ListedToolType): string {
  const id = TOOL_LIST_PAGES[type];
  return PAGES.find((page) => page.id === id)?.path ?? '/';
}
