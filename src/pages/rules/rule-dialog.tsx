import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FieldLabelWithHelp } from '@/components/field-label-with-help';
import { FormDialog } from '@/components/form-dialog';
import { HighRiskSwitch } from '@/components/high-risk';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useOperationForm } from '@/hooks/use-operation-form';
import { operationProblemMessage } from '@/i18n/problems';
import type { Decision, Rule, ToolRef, Workspace } from '@/lib/workspace';
import { addRule, resolveTool, updateRule } from '@/lib/workspace-operations';
import { DecisionToggle, ToolSelect } from '@/pages/rules/rule-fields';
import { usePatternTexts } from '@/pages/rules/rule-owner';
import { useAppStore } from '@/state/app-store';

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 为 `null` 时新增，否则编辑该规则。 */
  rule: Rule | null;
}

/** 新增或编辑权限规则。 */
export function RuleDialog({ open, onOpenChange, rule }: RuleDialogProps) {
  const { t } = useTranslation();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="narrow"
      title={t(rule ? 'rules.editTitle' : 'rules.addTitle')}
    >
      {/* 每次打开都以当前条目重新初始化表单。 */}
      {open && <RuleForm key={rule?.id ?? 'new'} rule={rule} onDone={() => onOpenChange(false)} />}
    </FormDialog>
  );
}

function RuleForm({ rule, onDone }: { rule: Rule | null; onDone: () => void }) {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const patternRef = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<ToolRef | null>(rule?.tool ?? null);
  const [pattern, setPattern] = useState(rule?.pattern ?? '');
  const [decision, setDecision] = useState<Decision>(rule?.decision ?? 'allow');
  const [highRisk, setHighRisk] = useState(rule?.high_risk ?? false);
  const patternTexts = usePatternTexts(tool ? resolveTool(workspace, tool) : null);

  const operation = (current: Workspace) => {
    const input = { tool, pattern, decision, high_risk: highRisk };
    return rule ? updateRule(current, rule.id, input) : addRule(current, input);
  };
  // 尚未选择工具只禁用保存；所选工具在填写期间被删除时才提示。
  const { problem, canSubmit, submit, clearSubmitProblem } = useOperationForm(operation, {
    quiet: (candidate) => candidate === 'toolEmpty',
    onDone,
  });

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FieldGroup>
        <Field data-invalid={problem ? true : undefined}>
          <FieldLabel htmlFor="rule-tool">{t('rules.tool')}</FieldLabel>
          <ToolSelect
            id="rule-tool"
            workspace={workspace}
            value={tool}
            autoFocus={!rule}
            onChange={(ref) => {
              setTool(ref);
              clearSubmitProblem();
              patternRef.current?.focus();
            }}
          />
          {problem && <FieldError>{operationProblemMessage(t, problem)}</FieldError>}
        </Field>
        <Field>
          <FieldLabelWithHelp
            htmlFor="rule-pattern"
            help={{ label: t('rules.patternHelp'), content: patternTexts.hint }}
          >
            {t('rules.pattern')}
          </FieldLabelWithHelp>
          <Input
            ref={patternRef}
            id="rule-pattern"
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
          id="rule-high-risk"
          checked={highRisk}
          onCheckedChange={setHighRisk}
          hint={t('notices.ruleHighRiskHint')}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
