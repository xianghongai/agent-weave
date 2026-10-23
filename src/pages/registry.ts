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
