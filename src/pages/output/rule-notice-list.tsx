import { cn } from 'cn';
import { PencilIcon, ShieldAlertIcon, SplitIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DECISION_TONE } from '@/components/decision-tone';
import { HIGH_RISK_TONE } from '@/components/high-risk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Notice } from '@/lib/generate';
import type { Rule, Workspace } from '@/lib/workspace';
import { resolveTool } from '@/lib/workspace-operations';
import { RuleDialog } from '@/pages/rules/rule-dialog';
import { ToolTypeBadge } from '@/pages/rules/rule-fields';

/* 输出页的规则提示汇总：当前 Agent 的高危提示和冲突提示，每条规则都可以直接打开编辑。 */

type RuleNotice = Extract<Notice, { type: 'highRisk' | 'conflict' }>;

function isRuleNotice(notice: Notice): notice is RuleNotice {
  return notice.type === 'highRisk' || notice.type === 'conflict';
}

/** 没有规则提示时不显示。其他类型的提示由各自所在的节展示。 */
export function RuleNoticeList({ workspace, notices }: { workspace: Workspace; notices: Notice[] }) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Rule | null>(null);
  const ruleNotices = notices.filter(isRuleNotice);
  if (ruleNotices.length === 0) {
    return null;
  }

  const ruleById = (id: string) => workspace.rules.find((rule) => rule.id === id);
  const edit = (rule: Rule) => {
    setEditTarget(rule);
    setEditOpen(true);
  };

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h2 className="flex items-center gap-2 font-medium">
          <TriangleAlertIcon className="size-4 text-brand" />
          {t('notices.title')}
          <Badge variant="secondary">{ruleNotices.length}</Badge>
        </h2>
        <p className="text-sm text-muted-foreground">{t('notices.hint')}</p>
      </div>
      <ul className="divide-y rounded-xl border">
        {ruleNotices.map((notice) => {
          const ruleIds = notice.type === 'highRisk' ? [notice.ruleId] : notice.ruleIds;
          const rules = ruleIds.map(ruleById).filter((rule) => rule !== undefined);
          return (
            <li key={`${notice.type}:${ruleIds.join(',')}`} className="grid gap-1.5 px-3 py-2">
              <NoticeHeading notice={notice} />
              <ul className="grid gap-0.5">
                {rules.map((rule) => (
                  <li key={rule.id}>
                    <RuleLine workspace={workspace} rule={rule} onEdit={() => edit(rule)} />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      <RuleDialog open={editOpen} onOpenChange={setEditOpen} rule={editTarget} />
    </section>
  );
}

function NoticeHeading({ notice }: { notice: RuleNotice }) {
  const { t } = useTranslation();
  const highRisk = notice.type === 'highRisk';
  const Icon = highRisk ? ShieldAlertIcon : SplitIcon;

  return (
    <div className="grid gap-0.5 text-sm">
      <span
        className={cn(
          'flex items-center gap-2 font-medium',
          highRisk ? HIGH_RISK_TONE : 'text-amber-700 dark:text-amber-400'
        )}
      >
        <Icon className="size-4" />
        {t(highRisk ? 'notices.highRisk' : 'notices.conflict')}
      </span>
      <p className="text-muted-foreground">{t(highRisk ? 'notices.highRiskDetail' : 'notices.conflictDetail')}</p>
    </div>
  );
}

/** 一条相关规则：工具、模式、决策，以及打开编辑对话框的按钮。 */
function RuleLine({ workspace, rule, onEdit }: { workspace: Workspace; rule: Rule; onEdit: () => void }) {
  const { t } = useTranslation();
  const tool = resolveTool(workspace, rule.tool);
  if (!tool) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        <code className="font-mono font-medium">{tool.tool.key}</code>
        <ToolTypeBadge type={tool.type} />
        {rule.pattern ? (
          <code className="font-mono break-all">{rule.pattern}</code>
        ) : (
          <span className="text-muted-foreground">{t('rules.wholeTool')}</span>
        )}
        <span className={cn('font-medium', DECISION_TONE[rule.decision])}>{t(`decisions.${rule.decision}`)}</span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('notices.editRule')}
        title={t('notices.editRule')}
        onClick={onEdit}
      >
        <PencilIcon />
      </Button>
    </div>
  );
}
