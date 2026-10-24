import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormDialog } from '@/components/form-dialog';
import { HighRiskSwitch } from '@/components/high-risk';
import { TagPicker } from '@/components/tag-picker';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useOperationForm } from '@/hooks/use-operation-form';
import { operationProblemMessage } from '@/i18n/problems';
import type { Agent, BuiltInTool, Workspace } from '@/lib/workspace';
import { addBuiltInTool, updateBuiltInTool } from '@/lib/workspace-operations';
import { TemplatePairFields } from '@/pages/agents/template-pair-fields';

interface BuiltInToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 所属的 Agent；新增时工具加入它的清单。 */
  agent: Agent | null;
  /** 为 `null` 时新增，否则编辑该内置工具。 */
  tool: BuiltInTool | null;
}

/** 新增或编辑某个 Agent 的内置工具。标识重复或为空时显示原因，不关闭对话框。 */
export function BuiltInToolDialog({ open, onOpenChange, agent, tool }: BuiltInToolDialogProps) {
  const { t } = useTranslation();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="narrow"
      title={t(tool ? 'builtInTools.editTitle' : 'builtInTools.addTitle', { agent: agent?.name ?? '' })}
    >
      {/* 每次打开都以当前条目重新初始化表单。 */}
      {open && agent && (
        <BuiltInToolForm
          key={tool?.id ?? `new:${agent.id}`}
          agent={agent}
          tool={tool}
          onDone={() => onOpenChange(false)}
        />
      )}
    </FormDialog>
  );
}

function BuiltInToolForm({ agent, tool, onDone }: { agent: Agent; tool: BuiltInTool | null; onDone: () => void }) {
  const { t } = useTranslation();
  const [key, setKey] = useState(tool?.key ?? '');
  const [description, setDescription] = useState(tool?.description ?? '');
  const [writes, setWrites] = useState(tool?.writes ?? false);
  const [highRisk, setHighRisk] = useState(tool?.high_risk ?? false);
  const [templates, setTemplates] = useState(tool?.templates ?? { with_pattern: '', without_pattern: '' });
  const [tagIds, setTagIds] = useState<string[]>(tool?.tag_ids ?? []);

  const operation = (current: Workspace) => {
    const input = { key, description, writes, templates, high_risk: highRisk, tag_ids: tagIds };
    return tool ? updateBuiltInTool(current, tool.id, input) : addBuiltInTool(current, agent.id, input);
  };
  // 标识重复时立即提示；空标识只禁用保存，不提示。
  const { problem, canSubmit, submit, clearSubmitProblem } = useOperationForm(operation, {
    quiet: (candidate) => candidate === 'keyEmpty',
    onDone,
  });

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FieldGroup>
        <Field data-invalid={problem ? true : undefined}>
          <FieldLabel htmlFor="built-in-tool-key">{t('builtInTools.key')}</FieldLabel>
          <Input
            id="built-in-tool-key"
            value={key}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder={t('builtInTools.keyPlaceholder')}
            aria-invalid={problem ? true : undefined}
            className="font-mono"
            onChange={(event) => {
              setKey(event.target.value);
              clearSubmitProblem();
            }}
          />
          {problem ? (
            <FieldError>{operationProblemMessage(t, problem)}</FieldError>
          ) : (
            <FieldDescription>{t('builtInTools.keyHint', { agent: agent.name })}</FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="built-in-tool-description">{t('builtInTools.description')}</FieldLabel>
          <Input
            id="built-in-tool-description"
            value={description}
            autoComplete="off"
            placeholder={t('common.optional')}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <Field orientation="horizontal">
          <Switch id="built-in-tool-writes" className="mt-0.5" checked={writes} onCheckedChange={setWrites} />
          <FieldContent>
            <FieldLabel htmlFor="built-in-tool-writes">{t('builtInTools.writes')}</FieldLabel>
            <FieldDescription>{t('builtInTools.writesHint')}</FieldDescription>
          </FieldContent>
        </Field>
        <HighRiskSwitch
          id="built-in-tool-high-risk"
          checked={highRisk}
          onCheckedChange={setHighRisk}
          hint={t('notices.toolHighRiskHint')}
        />
        <TemplatePairFields
          idPrefix="built-in-tool-templates"
          legend={t('agents.builtInTemplates')}
          help={{ with: t('agents.templateHelp.builtInWith'), without: t('agents.templateHelp.builtInWithout') }}
          value={templates}
          onChange={setTemplates}
        />
        <TagPicker value={tagIds} onChange={setTagIds} />
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
