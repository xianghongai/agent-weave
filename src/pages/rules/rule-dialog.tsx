import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { HighRiskSwitch } from '@/components/high-risk';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('rules.editTitle')}</DialogTitle>
        </DialogHeader>
        {open && rule && <RuleForm key={rule.id} rule={rule} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
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
          <FieldLabel htmlFor="rule-edit-pattern">{t('rules.pattern')}</FieldLabel>
          <Input
            id="rule-edit-pattern"
            value={pattern}
            autoComplete="off"
            spellCheck={false}
            placeholder={patternTexts.placeholder}
            className="font-mono"
            onChange={(event) => setPattern(event.target.value)}
          />
          <FieldDescription>{patternTexts.hint}</FieldDescription>
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
