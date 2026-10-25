import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { toolFilterToQuery } from '@/lib/filter-query';
import { TOOL_TYPES } from '@/lib/workspace';
import { NO_TOOL_FILTER, type ToolCounts } from '@/lib/workspace-operations';
import { hasToolListPage, toolListPath } from '@/pages/registry';

interface ToolCountBadgesProps {
  tagId: string;
  counts: ToolCounts;
}

/** 标签列表中按种类显示的工具数，数量为 0 的不显示；有列表页的种类可以点击，跳到对应页面并按该标签筛选。 */
export function ToolCountBadges({ tagId, counts }: ToolCountBadgesProps) {
  const { t } = useTranslation();
  const search = toolFilterToQuery({ ...NO_TOOL_FILTER, tagId }).toString();
  const types = TOOL_TYPES.filter((type) => counts[type] > 0);
  if (types.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {types.map((type) => {
        const label = t(`tags.toolCounts.${type}`, { count: counts[type] });
        // 不可点击的徽标用描边样式，与可点击的区分开。
        return hasToolListPage(type) ? (
          <Badge
            key={type}
            variant="secondary"
            title={t(`tags.showTools.${type}`)}
            render={<Link to={{ pathname: toolListPath(type), search }} />}
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
