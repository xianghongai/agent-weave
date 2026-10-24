import { cn } from 'cn';
import { PencilIcon, PlusIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DECISION_TONE } from '@/components/decision-tone';
import { Note, Page, PageScroll } from '@/components/page';
import { Button } from '@/components/ui/button';
import { useFilterQuery } from '@/hooks/use-filter-query';
import { ruleFilterFromQuery, ruleFilterToQuery } from '@/lib/filter-query';
import { toolOptions } from '@/lib/tool-options';
import type { Rule } from '@/lib/workspace';
import { deleteRule, listRules, matchesRuleFilter } from '@/lib/workspace-operations';
import { RuleDialog } from '@/pages/rules/rule-dialog';
import { ToolTypeBadge } from '@/pages/rules/rule-fields';
import { RuleFilterBar } from '@/pages/rules/rule-filter-bar';
import { OwnerBadge } from '@/pages/rules/rule-owner';
import { RuleWarningIcons, ruleWarnings } from '@/pages/rules/rule-warnings';
import { useAppStore } from '@/state/app-store';

export default function RulesPage() {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const applyOperation = useAppStore((state) => state.applyOperation);
  const [filter, setFilter] = useFilterQuery(ruleFilterFromQuery, ruleFilterToQuery);
  const allRules = listRules(workspace);
  const rules = allRules.filter((item) => matchesRuleFilter(item, filter));
  const warnings = ruleWarnings(allRules);

  const hasTools = toolOptions(workspace).length > 0;

  // 对话框关闭时保留目标条目，避免退场动画期间内容跳变。
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Rule | null>(null);

  function openEditor(rule: Rule | null) {
    setEditTarget(rule);
    setEditOpen(true);
  }

  return (
    <Page
      icon={ShieldCheckIcon}
      title={t('pages.rules.title')}
      description={t('pages.rules.description')}
      help={{ label: t('rules.listHelp'), content: t('rules.listHint') }}
      scroll="custom"
      actions={
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <RuleFilterBar workspace={workspace} value={filter} onChange={setFilter} />
          </div>
          <Button disabled={!hasTools} className="ml-auto" onClick={() => openEditor(null)}>
            <PlusIcon />
            {t('rules.add')}
          </Button>
        </div>
      }
    >
      {/* 标题和筛选栏固定，只有列表滚动。 */}
      <section className="flex flex-col gap-3 md:min-h-0 md:flex-1">
        {!hasTools ? (
          <Note icon={ShieldCheckIcon}>{t('rules.noTools')}</Note>
        ) : allRules.length === 0 ? (
          <Note icon={ShieldCheckIcon}>{t('rules.empty')}</Note>
        ) : rules.length === 0 ? (
          <Note icon={ShieldCheckIcon}>{t('rules.noMatch')}</Note>
        ) : (
          <PageScroll framed>
            <ul className="divide-y">
              {rules.map(({ rule, tool }) => (
                <li key={rule.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono text-sm">
                    <code className="font-medium">{tool.tool.key}</code>
                    <ToolTypeBadge type={tool.type} />
                    {/* 模式为空表示整个工具，不另外标注。 */}
                    {rule.pattern && <code className="break-all">{rule.pattern}</code>}
                    <OwnerBadge tool={tool} />
                  </div>
                  <RuleWarningIcons warning={warnings.get(rule.id)} />
                  <span className={cn('w-10 shrink-0 text-sm font-medium', DECISION_TONE[rule.decision])}>
                    {t(`decisions.${rule.decision}`)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('rules.editLabel')}
                    title={t('common.edit')}
                    onClick={() => openEditor(rule)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('rules.deleteLabel')}
                    title={t('common.delete')}
                    onClick={() => applyOperation((current) => deleteRule(current, rule.id))}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          </PageScroll>
        )}
      </section>

      <RuleDialog open={editOpen} onOpenChange={setEditOpen} rule={editTarget} />
    </Page>
  );
}
