import { cn } from 'cn';
import { PencilIcon, ShieldAlertIcon, SplitIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DECISION_TONE } from '@/components/decision-tone';
import { Button } from '@/components/ui/button';
import type { Notice } from '@/lib/notices';
import type { Rule, Workspace } from '@/lib/workspace';
import { resolveTool } from '@/lib/workspace-operations';
import { NoticeSection } from '@/pages/output/notice-section';
import { RuleDialog } from '@/pages/rules/rule-dialog';
import { ToolTypeBadge } from '@/pages/rules/rule-fields';

/* 输出页的规则提示：当前 Agent 的高危提示和冲突提示，各成一节，每条规则都可以直接打开编辑。 */

/** 先列高危提示，再列冲突提示；某一类没有时不显示该节。 */
export function RuleNoticeList({ workspace, notices }: { workspace: Workspace; notices: Notice[] }) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Rule | null>(null);

  const rulesOf = (ids: string[]) =>
    ids.map((id) => workspace.rules.find((rule) => rule.id === id)).filter((rule) => rule !== undefined);
  const highRisk = rulesOf(notices.flatMap((notice) => (notice.type === 'highRisk' ? [notice.ruleId] : [])));
  const conflicts = notices.flatMap((notice) => (notice.type === 'conflict' ? [rulesOf(notice.ruleIds)] : []));

  const edit = (rule: Rule) => {
    setEditTarget(rule);
    setEditOpen(true);
  };
  const ruleLine = (rule: Rule) => <RuleLine workspace={workspace} rule={rule} onEdit={() => edit(rule)} />;

  return (
    <>
      {highRisk.length > 0 && (
        <NoticeSection
          icon={ShieldAlertIcon}
          tone="highRisk"
          title={t('notices.highRisk')}
          count={highRisk.length}
          hint={t('notices.highRiskDetail')}
        >
          <ul className="divide-y rounded-xl border">
            {highRisk.map((rule) => (
              <li key={rule.id} className="px-3 py-1.5">
                {ruleLine(rule)}
              </li>
            ))}
          </ul>
        </NoticeSection>
      )}

      {conflicts.length > 0 && (
        <NoticeSection
          icon={SplitIcon}
          tone="warning"
          title={t('notices.conflict')}
          count={conflicts.length}
          hint={t('notices.conflictDetail')}
        >
          <ul className="divide-y rounded-xl border">
            {conflicts.map((rules) => (
              <li key={rules.map((rule) => rule.id).join(',')} className="px-3 py-1.5">
                <ul className="grid gap-0.5">
                  {rules.map((rule) => (
                    <li key={rule.id}>{ruleLine(rule)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </NoticeSection>
      )}

      <RuleDialog open={editOpen} onOpenChange={setEditOpen} rule={editTarget} />
    </>
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
