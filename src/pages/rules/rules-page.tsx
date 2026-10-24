import { cn } from 'cn';
import { ListIcon, PencilIcon, PlusIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DECISION_TONE } from '@/components/decision-tone';
import { Note, Page, PageScroll } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { operationProblemMessage } from '@/i18n/problems';
import type { Decision, Rule, ToolRef } from '@/lib/workspace';
import {
  NO_RULE_FILTER,
  type OperationProblem,
  type RuleFilter,
  addRule,
  deleteRule,
  listRules,
  matchesRuleFilter,
  resolveTool,
} from '@/lib/workspace-operations';
import { RuleDialog } from '@/pages/rules/rule-dialog';
import { DecisionToggle, ToolSelect, ToolTypeBadge } from '@/pages/rules/rule-fields';
import { PatternLabel } from '@/pages/rules/pattern-label';
import { RuleFilterBar } from '@/pages/rules/rule-filter-bar';
import {
  type OwnerFilter,
  OwnerBadge,
  OwnerFilterSelect,
  matchesOwner,
  usePatternTexts,
} from '@/pages/rules/rule-owner';
import { RuleWarningIcons, ruleWarnings } from '@/pages/rules/rule-warnings';
import { useAppStore } from '@/state/app-store';

export default function RulesPage() {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const applyOperation = useAppStore((state) => state.applyOperation);
  const [owner, setOwner] = useState<OwnerFilter>('all');
  const [filter, setFilter] = useState<RuleFilter>(NO_RULE_FILTER);
  const allRules = listRules(workspace);
  const rules = allRules.filter((item) => matchesOwner(item.tool, owner) && matchesRuleFilter(item, filter));
  const warnings = ruleWarnings(allRules);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Rule | null>(null);

  return (
    <Page
      icon={ShieldCheckIcon}
      title={t('pages.rules.title')}
      description={t('pages.rules.description')}
      scroll="custom"
    >
      {/* 新增表单、列表标题和筛选栏固定，只有规则列表滚动。 */}
      <div className="flex flex-col gap-6 md:min-h-0 md:flex-1">
        <AddRuleForm />

        <section className="flex flex-col gap-3 md:min-h-0 md:flex-1">
          <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
            <div className="grid gap-1">
              <h2 className="flex items-center gap-2 font-medium">
                <ListIcon className="size-4 text-brand" />
                {t('rules.listTitle')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('rules.listHint')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RuleFilterBar workspace={workspace} value={filter} onChange={setFilter} />
              <OwnerFilterSelect workspace={workspace} value={owner} onChange={setOwner} />
            </div>
          </div>

          <PageScroll>
            {allRules.length === 0 ? (
              <Note icon={ShieldCheckIcon}>{t('rules.empty')}</Note>
            ) : rules.length === 0 ? (
              <Note icon={ShieldCheckIcon}>{t('rules.noMatch')}</Note>
            ) : (
              <ul className="divide-y rounded-xl border">
                {rules.map(({ rule, tool }) => (
                  <li key={rule.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono text-sm">
                      <code className="font-medium">{tool.tool.key}</code>
                      <ToolTypeBadge type={tool.type} />
                      {rule.pattern ? (
                        <code className="break-all">{rule.pattern}</code>
                      ) : (
                        <span className="font-sans text-muted-foreground">{t('rules.wholeTool')}</span>
                      )}
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
                      onClick={() => {
                        setEditTarget(rule);
                        setEditOpen(true);
                      }}
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
            )}
          </PageScroll>
        </section>
      </div>

      <RuleDialog open={editOpen} onOpenChange={setEditOpen} rule={editTarget} />
    </Page>
  );
}

/**
 * 新增规则：先选工具，再填可选的模式，最后选决策。
 * 添加后保留工具和决策、清空模式并回到模式输入框，便于在同一工具下连续添加。
 */
function AddRuleForm() {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const applyOperation = useAppStore((state) => state.applyOperation);
  const patternRef = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<ToolRef | null>(null);
  const [pattern, setPattern] = useState('');
  const [decision, setDecision] = useState<Decision>('allow');
  const [problem, setProblem] = useState<OperationProblem | null>(null);

  // 所选工具被删除后，表单回到未选状态。
  const resolved = tool ? resolveTool(workspace, tool) : null;
  const selected = resolved ? tool : null;
  const patternTexts = usePatternTexts(resolved);
  const hasTools =
    workspace.command_tools.length > 0 ||
    workspace.mcp_servers.length > 0 ||
    workspace.agents.some((agent) => agent.built_in_tools.length > 0);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) {
      return;
    }
    const result = applyOperation((current) => addRule(current, { tool: selected, pattern, decision }));
    if (result) {
      setProblem(result);
      return;
    }
    setProblem(null);
    setPattern('');
    patternRef.current?.focus();
  }

  return (
    <section className="grid shrink-0 gap-3 rounded-xl border bg-card p-4">
      <div className="grid gap-1">
        <h2 className="flex items-center gap-2 font-medium">
          <PlusIcon className="size-4 text-brand" />
          {t('rules.addTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('rules.addHint')}</p>
      </div>

      {hasTools ? (
        <form onSubmit={submit} className="grid items-start gap-4 md:grid-cols-[minmax(10rem,14rem)_1fr_auto_auto]">
          <Field data-invalid={problem ? true : undefined}>
            <FieldLabel htmlFor="rule-add-tool">{t('rules.tool')}</FieldLabel>
            <ToolSelect
              id="rule-add-tool"
              workspace={workspace}
              value={selected}
              onChange={(ref) => {
                setTool(ref);
                setProblem(null);
                patternRef.current?.focus();
              }}
            />
            {problem && <FieldError>{operationProblemMessage(t, problem)}</FieldError>}
          </Field>
          <Field>
            <PatternLabel htmlFor="rule-add-pattern" hint={patternTexts.hint} />
            <Input
              ref={patternRef}
              id="rule-add-pattern"
              value={pattern}
              autoComplete="off"
              spellCheck={false}
              placeholder={patternTexts.placeholder}
              className="font-mono"
              onChange={(event) => setPattern(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>{t('rules.decision')}</FieldLabel>
            <DecisionToggle value={decision} onChange={setDecision} />
          </Field>
          <Button type="submit" disabled={!selected} className="md:mt-6">
            <PlusIcon />
            {t('common.add')}
          </Button>
        </form>
      ) : (
        <Note icon={ShieldCheckIcon}>{t('rules.noTools')}</Note>
      )}
    </section>
  );
}
