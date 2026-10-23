import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { operationProblemMessage } from '@/i18n/problems';
import type { Tag, Workspace } from '@/lib/workspace';
import { type OperationProblem, addTag, updateTag } from '@/lib/workspace-operations';
import { runOperation, useWorkspace } from '@/state/workspace-store';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(tag ? 'tags.editTitle' : 'tags.addTitle')}</DialogTitle>
        </DialogHeader>
        {/* 每次打开都以当前条目重新初始化表单。 */}
        {open && <TagForm key={tag?.id ?? 'new'} tag={tag} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function TagForm({ tag, onDone }: { tag: Tag | null; onDone: () => void }) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const [key, setKey] = useState(tag?.key ?? '');
  const [name, setName] = useState(tag?.name ?? '');
  const [submitProblem, setSubmitProblem] = useState<OperationProblem | null>(null);

  const operation = (current: Workspace) => {
    const input = { key, name };
    return tag ? updateTag(current, tag.id, input) : addTag(current, input);
  };
  // 操作是纯函数，可以边输入边试算，标识重复时立即提示。空标识、空名称只禁用保存，不提示。
  const trial = operation(workspace);
  const liveProblem =
    'problem' in trial && trial.problem !== 'keyEmpty' && trial.problem !== 'nameEmpty' ? trial.problem : null;
  const problem = submitProblem ?? liveProblem;
  const keyProblem = problem && problem !== 'nameEmpty' ? problem : null;
  const nameProblem = problem === 'nameEmpty' ? problem : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = runOperation(operation);
    if (result) {
      setSubmitProblem(result);
    } else {
      onDone();
    }
  }

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
              setSubmitProblem(null);
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
              setSubmitProblem(null);
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
        <Button type="submit" disabled={'problem' in trial}>
          {t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
