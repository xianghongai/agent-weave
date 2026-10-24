import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FieldLabelWithHelp } from '@/components/field-label-with-help';
import { FormDialog } from '@/components/form-dialog';
import { HighRiskSwitch, initialHighRisk } from '@/components/high-risk';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useOperationForm } from '@/hooks/use-operation-form';
import { operationProblemMessage } from '@/i18n/problems';
import { NOT_HIGH_RISK, type Decision, type Rule, type ToolRef, type Workspace } from '@/lib/workspace';
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
  const [description, setDescription] = useState(rule?.description ?? '');
  const [highRisk, setHighRisk] = useState(initialHighRisk(rule));
  const resolved = tool ? resolveTool(workspace, tool) : null;
  const patternTexts = usePatternTexts(resolved);
  /** “保存并继续新增”后刚新增的规则，提示已保存。 */
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const operation = (current: Workspace) => {
    const input = { tool, pattern, decision, description, ...highRisk };
    return rule ? updateRule(current, rule.id, input) : addRule(current, input);
  };
  // 尚未选择工具只禁用保存；所选工具在填写期间被删除时才提示。
  const { problem, canSubmit, submit, submitAndContinue, clearSubmitProblem } = useOperationForm(operation, {
    quiet: (candidate) => candidate === 'toolEmpty',
    onDone,
  });

  // 重复是模式与决策的组合问题，提示放在模式下方；其余原因与所选工具有关。
  const duplicate = problem === 'ruleDuplicate';
  const toolProblem = problem && !duplicate ? problem : null;

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FieldGroup>
        <Field data-invalid={toolProblem ? true : undefined}>
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
          {toolProblem && <FieldError>{operationProblemMessage(t, toolProblem)}</FieldError>}
        </Field>
        <Field data-invalid={duplicate ? true : undefined}>
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
            aria-invalid={duplicate ? true : undefined}
            onChange={(event) => setPattern(event.target.value)}
          />
          {duplicate && <FieldError>{operationProblemMessage(t, 'ruleDuplicate')}</FieldError>}
        </Field>
        <Field>
          <FieldLabel>{t('rules.decision')}</FieldLabel>
          <DecisionToggle value={decision} onChange={setDecision} />
        </Field>
        <Field>
          <FieldLabel htmlFor="rule-description">{t('rules.description')}</FieldLabel>
          <Input
            id="rule-description"
            value={description}
            autoComplete="off"
            placeholder={t('common.optional')}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <HighRiskSwitch
          id="rule-high-risk"
          value={highRisk}
          onChange={setHighRisk}
          hint={t('notices.ruleHighRiskHint')}
        />
      </FieldGroup>
      <DialogFooter>
        {lastAdded && (
          <p role="status" className="self-center text-sm break-all text-muted-foreground sm:mr-auto">
            {t('common.added', { label: lastAdded })}
          </p>
        )}
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        {/* 只在新增时提供：保留工具和决策，清空模式，便于在同一工具下连续添加多条规则。 */}
        {!rule && (
          <Button
            type="button"
            variant="outline"
            disabled={!canSubmit}
            onClick={() =>
              submitAndContinue(() => {
                setLastAdded([resolved?.tool.key, pattern.trim()].filter(Boolean).join(' '));
                setPattern('');
                setDescription('');
                setHighRisk(NOT_HIGH_RISK);
                patternRef.current?.focus();
              })
            }
          >
            {t('common.saveAndContinue')}
          </Button>
        )}
        <Button type="submit" disabled={!canSubmit}>
          {t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
