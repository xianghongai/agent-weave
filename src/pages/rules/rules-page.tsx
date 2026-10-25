import { cn } from 'cn';
import { PencilIcon, PlusIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DECISION_TONE } from '@/components/decision-tone';
import { Note, Page, PageScroll } from '@/components/page';
import { ItemDescription } from '@/components/item-description';
import { ToolSummary } from '@/components/tag-badges';
import { Button } from '@/components/ui/button';
import { useFilterQuery } from '@/hooks/use-filter-query';
import { ruleFilterFromQuery, ruleFilterToQuery } from '@/lib/filter-query';
import { toolOptions } from '@/lib/tool-options';
import type { Rule } from '@/lib/workspace';
import { deleteRule, groupRulesByTool, listRules, matchesRuleFilter } from '@/lib/workspace-operations';
import { RuleDialog } from '@/pages/rules/rule-dialog';
import { ToolTypeBadge } from '@/pages/rules/rule-fields';
import { RuleFilterBar } from '@/pages/rules/rule-filter-bar';
import { OwnerBadge } from '@/pages/rules/rule-owner';
import { type RuleWarning, RuleWarningIcons, ruleWarnings } from '@/pages/rules/rule-warnings';
import { useAppStore } from '@/state/app-store';

export default function RulesPage() {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const applyOperation = useAppStore((state) => state.applyOperation);
  const [filter, setFilter] = useFilterQuery(ruleFilterFromQuery, ruleFilterToQuery);
  const allRules = listRules(workspace);
  const groups = groupRulesByTool(allRules.filter((item) => matchesRuleFilter(item, filter)));
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
        ) : groups.length === 0 ? (
          <Note icon={ShieldCheckIcon}>{t('rules.noMatch')}</Note>
        ) : (
          <PageScroll framed>
            <ul className="divide-y">
              {groups.map(({ tool, rules: toolRules }) => {
                // 模式为空表示整个工具，是默认情况：这条规则的决策和操作放在组头，与工具标识同一行。
                // 列表按模式排序，模式为空的规则排在组内最前面。
                const [whole, patterned] =
                  toolRules[0]?.pattern === '' ? [toolRules[0], toolRules.slice(1)] : [null, toolRules];
                const actions = (rule: Rule) => (
                  <RuleActions
                    rule={rule}
                    label={`${tool.tool.key} ${rule.pattern}`.trim()}
                    warning={warnings.get(rule.id)}
                    onEdit={() => openEditor(rule)}
                    onDelete={() => applyOperation((current) => deleteRule(current, rule.id))}
                  />
                );
                return (
                  <li key={`${tool.type}:${tool.tool.id}`}>
                    {/* 组头：工具的标识、类型、归属、描述和标签排成一行，同一工具的规则共用。组的上下间距放在行内，悬停底色才能连成整块。 */}
                    <div className="flex min-h-8 items-center gap-3 px-3 py-1.5 transition-colors hover:bg-muted/40">
                      <div className="min-w-0 flex-1">
                        <ToolSummary
                          toolKey={tool.tool.key}
                          description={tool.tool.description}
                          tagIds={tool.tool.tag_ids}
                        >
                          <ToolTypeBadge type={tool.type} />
                          <OwnerBadge tool={tool} />
                        </ToolSummary>
                      </div>
                      {whole && <ItemDescription description={whole.description} className={RULE_DESCRIPTION} />}
                      {whole && actions(whole)}
                    </div>
                    {patterned.length > 0 && (
                      <ul>
                        {patterned.map((rule) => (
                          <li
                            key={rule.id}
                            className="flex items-center gap-3 pr-3 pl-6 transition-colors last:pb-1.5 hover:bg-muted/40"
                          >
                            <code className="min-w-0 flex-1 font-mono text-sm break-all">{rule.pattern}</code>
                            <ItemDescription description={rule.description} className={RULE_DESCRIPTION} />
                            {actions(rule)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </PageScroll>
        )}
      </section>

      <RuleDialog open={editOpen} onOpenChange={setEditOpen} rule={editTarget} />
    </Page>
  );
}

/** 规则的描述紧挨在决策左侧，最多占半行，免得挤掉模式和工具标识。 */
const RULE_DESCRIPTION = 'max-w-1/2';

interface RuleActionsProps {
  rule: Rule;
  /** 屏幕阅读器用来区分各行按钮的规则文字：工具标识加模式。 */
  label: string;
  warning: RuleWarning | undefined;
  onEdit: () => void;
  onDelete: () => void;
}

/** 一条规则右侧的警告、决策和编辑、删除按钮。 */
function RuleActions({ rule, label, warning, onEdit, onDelete }: RuleActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 items-center gap-3">
      <RuleWarningIcons warning={warning} />
      <span className={cn('w-10 shrink-0 text-sm font-medium', DECISION_TONE[rule.decision])}>
        {t(`decisions.${rule.decision}`)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('rules.editLabel', { rule: label })}
        title={t('common.edit')}
        onClick={onEdit}
      >
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('rules.deleteLabel', { rule: label })}
        title={t('common.delete')}
        onClick={onDelete}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}
