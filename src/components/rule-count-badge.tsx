import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { ruleFilterToQuery } from '@/lib/filter-query';
import type { ToolRef } from '@/lib/workspace';
import { NO_RULE_FILTER, countRulesForTool } from '@/lib/workspace-operations';
import { pageById } from '@/pages/registry';
import { useAppStore } from '@/state/app-store';

/** 工具列表中指向该工具的规则数，数量为 0 时不显示；点击跳到规则页并按该工具筛选。 */
export function RuleCountBadge({ tool }: { tool: ToolRef }) {
  const { t } = useTranslation();
  const count = useAppStore((state) => countRulesForTool(state.workspace, tool));
  if (count === 0) {
    return null;
  }
  const search = ruleFilterToQuery({ ...NO_RULE_FILTER, tool }).toString();

  return (
    <Badge
      variant="secondary"
      title={t('rules.showForTool')}
      render={<Link to={{ pathname: pageById('rules').path, search }} />}
    >
      {t('rules.count', { n: count })}
    </Badge>
  );
}
