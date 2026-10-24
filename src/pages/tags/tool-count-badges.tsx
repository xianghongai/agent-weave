import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import type { TagFilterState } from '@/browser/history-state';
import { Badge } from '@/components/ui/badge';
import { TOOL_TYPES, type ToolType } from '@/lib/workspace';
import type { ToolCounts } from '@/lib/workspace-operations';

/** 可以带着标签筛选跳转的页面；内置工具分散在各 Agent 中，没有对应的列表页。 */
const LIST_PATHS = { command: '/tools', mcp: '/mcp' } as const;

function hasListPage(type: ToolType): type is keyof typeof LIST_PATHS {
  return type in LIST_PATHS;
}

interface ToolCountBadgesProps {
  tagId: string;
  counts: ToolCounts;
}

/** 标签列表中按种类显示的工具数，数量为 0 的不显示；命令工具和 MCP 工具可以点击，跳到对应页面并按该标签筛选。 */
export function ToolCountBadges({ tagId, counts }: ToolCountBadgesProps) {
  const { t } = useTranslation();
  const state: TagFilterState = { tagId };
  const types = TOOL_TYPES.filter((type) => counts[type] > 0);
  if (types.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {types.map((type) => {
        const label = t(`tags.toolCounts.${type}`, { n: counts[type] });
        // 不可点击的徽标用描边样式，与可点击的区分开。
        return hasListPage(type) ? (
          <Badge
            key={type}
            variant="secondary"
            title={t(`tags.showTools.${type}`)}
            render={<Link href={LIST_PATHS[type]} state={state} />}
          >
            {label}
          </Badge>
        ) : (
          <Badge key={type} variant="outline">
            {label}
          </Badge>
        );
      })}
    </div>
  );
}
