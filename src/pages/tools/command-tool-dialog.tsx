import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormDialog } from '@/components/form-dialog';
import { HighRiskSwitch, initialHighRisk } from '@/components/high-risk';
import { TagPicker } from '@/components/tag-picker';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useOperationForm } from '@/hooks/use-operation-form';
import { operationProblemMessage } from '@/i18n/problems';
import { NOT_HIGH_RISK, type CommandTool, type Workspace } from '@/lib/workspace';
import { addCommandTool, updateCommandTool } from '@/lib/workspace-operations';

interface CommandToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 为 `null` 时新增，否则编辑该命令工具。 */
  tool: CommandTool | null;
}

/** 新增或编辑命令工具。标识重复或为空时显示原因，不关闭对话框。 */
export function CommandToolDialog({ open, onOpenChange, tool }: CommandToolDialogProps) {
  const { t } = useTranslation();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="narrow"
      title={t(tool ? 'tools.editTitle' : 'tools.addTitle')}
    >
      {/* 每次打开都以当前条目重新初始化表单。 */}
      {open && <CommandToolForm key={tool?.id ?? 'new'} tool={tool} onDone={() => onOpenChange(false)} />}
    </FormDialog>
  );
}

function CommandToolForm({ tool, onDone }: { tool: CommandTool | null; onDone: () => void }) {
  const { t } = useTranslation();
  const [key, setKey] = useState(tool?.key ?? '');
  const [description, setDescription] = useState(tool?.description ?? '');
  const [highRisk, setHighRisk] = useState(initialHighRisk(tool));
  const [tagIds, setTagIds] = useState<string[]>(tool?.tag_ids ?? []);
  const keyRef = useRef<HTMLInputElement>(null);
  /** “保存并继续新增”后刚新增的标识，提示已保存。 */
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const operation = (current: Workspace) => {
    const input = { key, description, ...highRisk, tag_ids: tagIds };
    return tool ? updateCommandTool(current, tool.id, input) : addCommandTool(current, input);
  };
  // 标识重复时立即提示；空标识只禁用保存，不提示。
  const { problem, canSubmit, submit, submitAndContinue, clearSubmitProblem } = useOperationForm(operation, {
    quiet: (candidate) => candidate === 'keyEmpty',
    onDone,
  });

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FieldGroup>
        <Field data-invalid={problem ? true : undefined}>
          <FieldLabel htmlFor="command-tool-key">{t('tools.key')}</FieldLabel>
          <Input
            ref={keyRef}
            id="command-tool-key"
            value={key}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder={t('tools.keyPlaceholder')}
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
            <FieldDescription>{t('tools.keyHint')}</FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="command-tool-description">{t('tools.description')}</FieldLabel>
          <Input
            id="command-tool-description"
            value={description}
            autoComplete="off"
            placeholder={t('common.optional')}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <HighRiskSwitch
          id="command-tool-high-risk"
          value={highRisk}
          onChange={setHighRisk}
          hint={t('notices.toolHighRiskHint')}
        />
        <TagPicker value={tagIds} onChange={setTagIds} />
      </FieldGroup>
      <DialogFooter>
        {lastAdded && (
          <p role="status" className="self-center text-sm text-muted-foreground sm:mr-auto">
            {t('common.added', { label: lastAdded })}
          </p>
        )}
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        {/* 只在新增时提供：保留所选标签，清空其余字段，便于连续新增同类工具。 */}
        {!tool && (
          <Button
            type="button"
            variant="outline"
            disabled={!canSubmit}
            onClick={() =>
              submitAndContinue(() => {
                setLastAdded(key.trim());
                setKey('');
                setDescription('');
                setHighRisk(NOT_HIGH_RISK);
                keyRef.current?.focus();
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
