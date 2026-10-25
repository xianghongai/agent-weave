import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useOperationForm } from '@/hooks/use-operation-form';
import { operationProblemMessage } from '@/i18n/problems';
import type { Tag, Workspace } from '@/lib/workspace';
import { addTag, updateTag } from '@/lib/workspace-operations';

interface TagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 为 `null` 时新增，否则重命名该标签。 */
  tag: Tag | null;
}

/** 新增或重命名标签。标识为空或重复、名称为空时显示原因，不关闭对话框。 */
export function TagDialog({ open, onOpenChange, tag }: TagDialogProps) {
  const { t } = useTranslation();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="narrow"
      title={t(tag ? 'tags.editTitle' : 'tags.addTitle')}
    >
      {/* 每次打开都以当前条目重新初始化表单。 */}
      {open && <TagForm key={tag?.id ?? 'new'} tag={tag} onDone={() => onOpenChange(false)} />}
    </FormDialog>
  );
}

function TagForm({ tag, onDone }: { tag: Tag | null; onDone: () => void }) {
  const { t } = useTranslation();
  const [key, setKey] = useState(tag?.key ?? '');
  const [name, setName] = useState(tag?.name ?? '');

  const operation = (current: Workspace) => {
    const input = { key, name };
    return tag ? updateTag(current, tag.id, input) : addTag(current, input);
  };
  // 标识重复时立即提示；空标识、空名称只禁用保存，不提示。
  const { problem, canSubmit, submit, clearSubmitProblem } = useOperationForm(operation, {
    quiet: (candidate) => candidate === 'keyEmpty' || candidate === 'nameEmpty',
    onDone,
  });
  const keyProblem = problem && problem !== 'nameEmpty' ? problem : null;
  const nameProblem = problem === 'nameEmpty' ? problem : null;

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FieldGroup>
        <Field data-invalid={keyProblem ? true : undefined}>
          <FieldLabel htmlFor="tag-key">{t('tags.key')}</FieldLabel>
          <Input
            id="tag-key"
            value={key}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder={t('tags.keyPlaceholder')}
            aria-invalid={keyProblem ? true : undefined}
            className="font-mono"
            onChange={(event) => {
              setKey(event.target.value);
              clearSubmitProblem();
            }}
          />
          {keyProblem ? (
            <FieldError>{operationProblemMessage(t, keyProblem)}</FieldError>
          ) : (
            <FieldDescription>{t('tags.keyHint')}</FieldDescription>
          )}
        </Field>
        <Field data-invalid={nameProblem ? true : undefined}>
          <FieldLabel htmlFor="tag-name">{t('tags.name')}</FieldLabel>
          <Input
            id="tag-name"
            value={name}
            autoComplete="off"
            placeholder={t('tags.namePlaceholder')}
            aria-invalid={nameProblem ? true : undefined}
            onChange={(event) => {
              setName(event.target.value);
              clearSubmitProblem();
            }}
          />
          {nameProblem ? (
            <FieldError>{operationProblemMessage(t, nameProblem)}</FieldError>
          ) : (
            <FieldDescription>{t('tags.nameHint')}</FieldDescription>
          )}
        </Field>
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
