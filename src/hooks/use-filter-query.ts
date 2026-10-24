import { useSearchParams } from 'react-router';

import type { Workspace } from '@/lib/workspace';
import { useAppStore } from '@/state/app-store';

/**
 * 列表页的筛选条件，存放在当前页面的 URL 查询串中，见 `docs/adr/0003-react-router-filter-query.md`。
 * 从其他页面带着条件跳过来，也只是同样的查询串。
 * 页面内修改时替换当前历史记录，不新增记录，后退直接回到上一个页面。
 */
export function useFilterQuery<Filter>(
  fromQuery: (workspace: Workspace, query: URLSearchParams) => Filter,
  toQuery: (filter: Filter) => URLSearchParams
): [Filter, (next: Filter) => void] {
  const workspace = useAppStore((state) => state.workspace);
  const [query, setQuery] = useSearchParams();
  return [fromQuery(workspace, query), (next) => setQuery(toQuery(next), { replace: true })];
}
