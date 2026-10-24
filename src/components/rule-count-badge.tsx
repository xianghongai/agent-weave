import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import type { ToolRuleFilterState } from '@/browser/history-state';
import { Badge } from '@/components/ui/badge';
import type { ToolRef } from '@/lib/workspace';
import { countRulesForTool } from '@/lib/workspace-operations';
import { pageById } from '@/pages/registry';
import { useAppStore } from '@/state/app-store';

/** 工具列表中指向该工具的规则数，数量为 0 时不显示；点击跳到规则页并按该工具筛选。 */
export function RuleCountBadge({ tool }: { tool: ToolRef }) {
  const { t } = useTranslation();
  const count = useAppStore((state) => countRulesForTool(state.workspace, tool));
  if (count === 0) {
    return null;
  }
  const state: ToolRuleFilterState = { tool };

  return (
    <Badge
      variant="secondary"
      title={t('rules.showForTool')}
      render={<Link href={pageById('rules').path} state={state} />}
    >
      {t('rules.count', { n: count })}
    </Badge>
  );
}
