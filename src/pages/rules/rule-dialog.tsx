import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FieldLabelWithHelp } from '@/components/field-label-with-help';
import { FormDialog } from '@/components/form-dialog';
import { HighRiskSwitch } from '@/components/high-risk';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { operationProblemMessage } from '@/i18n/problems';
import type { Rule } from '@/lib/workspace';
import { type OperationProblem, resolveTool, updateRule } from '@/lib/workspace-operations';
import { DecisionToggle, ToolSelect } from '@/pages/rules/rule-fields';
import { usePatternTexts } from '@/pages/rules/rule-owner';
import { useAppStore } from '@/state/app-store';

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: Rule | null;
}

/** 编辑一条已有的权限规则。新增在页面顶部的表单中完成。 */
export function RuleDialog({ open, onOpenChange, rule }: RuleDialogProps) {
  const { t } = useTranslation();

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="narrow" title={t('rules.editTitle')}>
      {open && rule && <RuleForm key={rule.id} rule={rule} onDone={() => onOpenChange(false)} />}
    </FormDialog>
  );
}

function RuleForm({ rule, onDone }: { rule: Rule; onDone: () => void }) {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const applyOperation = useAppStore((state) => state.applyOperation);
  const [tool, setTool] = useState(rule.tool);
  const [pattern, setPattern] = useState(rule.pattern);
  const [decision, setDecision] = useState(rule.decision);
  const [highRisk, setHighRisk] = useState(rule.high_risk);
  const [problem, setProblem] = useState<OperationProblem | null>(null);
  const patternTexts = usePatternTexts(resolveTool(workspace, tool));

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = applyOperation((current) =>
      updateRule(current, rule.id, { tool, pattern, decision, high_risk: highRisk })
    );
    if (result) {
      setProblem(result);
    } else {
      onDone();
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FieldGroup>
        <Field data-invalid={problem ? true : undefined}>
          <FieldLabel htmlFor="rule-edit-tool">{t('rules.tool')}</FieldLabel>
          <ToolSelect id="rule-edit-tool" workspace={workspace} value={tool} onChange={setTool} />
          {problem && <FieldError>{operationProblemMessage(t, problem)}</FieldError>}
        </Field>
        <Field>
          <FieldLabelWithHelp
            htmlFor="rule-edit-pattern"
            help={{ label: t('rules.patternHelp'), content: patternTexts.hint }}
          >
            {t('rules.pattern')}
          </FieldLabelWithHelp>
          <Input
            id="rule-edit-pattern"
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
        <HighRiskSwitch
          id="rule-edit-high-risk"
          checked={highRisk}
          onCheckedChange={setHighRisk}
          hint={t('notices.ruleHighRiskHint')}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('common.save')}</Button>
      </DialogFooter>
    </form>
  );
}
