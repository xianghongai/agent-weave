import { ShieldAlertIcon, SplitIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { HIGH_RISK_TONE, HighRiskTooltip } from '@/components/high-risk';
import { highRiskReasons, ruleNotices } from '@/lib/rule-notices';
import type { RuleListItem } from '@/lib/workspace-operations';

/* 规则列表上的高危与冲突图标。 */

export interface RuleWarning {
  highRisk: boolean;
  /** 规则与所指工具上填写的高危说明，悬停高危图标时显示。 */
  highRiskReasons: string[];
  conflict: boolean;
}

/** 冲突图标的配色，与“询问”同属提醒色。 */
const CONFLICT_TONE = 'text-amber-700 dark:text-amber-400';

/**
 * 按规则的内部 ID 汇总提示。传入全部规则而不是筛选后的规则，冲突才不会因筛选而漏掉。
 * 与生成不同，这里不区分 Agent：内置工具的规则本就只属于一个 Agent，不会与其他 Agent 的规则冲突。
 */
export function ruleWarnings(items: RuleListItem[]): Map<string, RuleWarning> {
  const warnings = new Map<string, RuleWarning>();
  const itemById = new Map(items.map((item) => [item.rule.id, item]));
  const warningOf = (ruleId: string) => {
    let warning = warnings.get(ruleId);
    if (!warning) {
      warning = { highRisk: false, highRiskReasons: [], conflict: false };
      warnings.set(ruleId, warning);
    }
    return warning;
  };
  for (const notice of ruleNotices(items)) {
    if (notice.type === 'highRisk') {
      const warning = warningOf(notice.ruleId);
      const item = itemById.get(notice.ruleId);
      warning.highRisk = true;
      warning.highRiskReasons = item ? highRiskReasons(item) : [];
    } else if (notice.type === 'conflict') {
      for (const ruleId of notice.ruleIds) {
        warningOf(ruleId).conflict = true;
      }
    }
  }
  return warnings;
}

/** 规则没有提示时不渲染任何内容。 */
export function RuleWarningIcons({ warning }: { warning: RuleWarning | undefined }) {
  const { t } = useTranslation();
  if (!warning) {
    return null;
  }
  // 高危图标的提示：先说明这是高危规则，再列出规则与工具上填写的高危说明。
  const highRiskLines = [t('notices.highRiskRule'), ...warning.highRiskReasons];

  return (
    <span className="flex shrink-0 items-center gap-1">
      {warning.highRisk && (
        <HighRiskTooltip reasons={highRiskLines}>
          <span role="img" tabIndex={0} aria-label={highRiskLines.join(' ')}>
            <ShieldAlertIcon className={`size-4 ${HIGH_RISK_TONE}`} />
          </span>
        </HighRiskTooltip>
      )}
      {warning.conflict && (
        <span role="img" aria-label={t('notices.conflictRule')} title={t('notices.conflictRule')}>
          <SplitIcon className={`size-4 ${CONFLICT_TONE}`} />
        </span>
      )}
    </span>
  );
}
