import { cn } from 'cn';
import { ListIcon, PencilIcon, PlusIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DECISION_TONE } from '@/components/decision-tone';
import { Note, Page } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { operationProblemMessage } from '@/i18n/problems';
import type { Decision, Rule, ToolRef } from '@/lib/workspace';
import { type OperationProblem, addRule, deleteRule, listRules, resolveTool } from '@/lib/workspace-operations';
import { RuleDialog } from '@/pages/rules/rule-dialog';
import { DecisionToggle, ToolSelect } from '@/pages/rules/rule-fields';
import { runOperation, useWorkspace } from '@/state/workspace-store';

export default function RulesPage() {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const rules = listRules(workspace);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Rule | null>(null);

  return (
    <Page icon={ShieldCheckIcon} title={t('pages.rules.title')} description={t('pages.rules.description')}>
      <div className="grid gap-8">
        <AddRuleForm />

        <section className="grid gap-3">
          <div className="grid gap-1">
            <h2 className="flex items-center gap-2 font-medium">
              <ListIcon className="size-4 text-brand" />
              {t('rules.listTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('rules.listHint')}</p>
          </div>

          {rules.length === 0 ? (
            <Note icon={ShieldCheckIcon}>{t('rules.empty')}</Note>
          ) : (
            <ul className="divide-y rounded-xl border">
              {rules.map(({ rule, tool }) => (
                <li key={rule.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono text-sm">
                    <code className="font-medium">{tool.tool.key}</code>
                    {rule.pattern ? (
                      <code className="break-all">{rule.pattern}</code>
                    ) : (
                      <span className="font-sans text-muted-foreground">{t('rules.wholeTool')}</span>
                    )}
                  </div>
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
                    onClick={() => runOperation((current) => deleteRule(current, rule.id))}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
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
  const workspace = useWorkspace();
  const patternRef = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<ToolRef | null>(null);
  const [pattern, setPattern] = useState('');
  const [decision, setDecision] = useState<Decision>('allow');
  const [problem, setProblem] = useState<OperationProblem | null>(null);

  // 所选工具被删除后，表单回到未选状态。
  const selected = tool && resolveTool(workspace, tool) ? tool : null;
  const hasTools = workspace.command_tools.length > 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) {
      return;
    }
    const result = runOperation((current) => addRule(current, { tool: selected, pattern, decision }));
    if (result) {
      setProblem(result);
      return;
    }
    setProblem(null);
    setPattern('');
    patternRef.current?.focus();
  }

  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4">
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
            <FieldLabel htmlFor="rule-add-pattern">{t('rules.pattern')}</FieldLabel>
            <Input
              ref={patternRef}
              id="rule-add-pattern"
              value={pattern}
              autoComplete="off"
              spellCheck={false}
              placeholder={t('rules.patternPlaceholder')}
              className="font-mono"
              onChange={(event) => setPattern(event.target.value)}
            />
            <FieldDescription>{t('rules.patternHint')}</FieldDescription>
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
