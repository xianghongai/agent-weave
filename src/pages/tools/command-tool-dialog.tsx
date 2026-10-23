import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TagPicker } from '@/components/tag-picker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { operationProblemMessage } from '@/i18n/problems';
import type { CommandTool, Workspace } from '@/lib/workspace';
import {
  type OperationProblem,
  addCommandTool,
  setToolTags,
  systemContext,
  updateCommandTool,
} from '@/lib/workspace-operations';
import { runOperation, useWorkspace } from '@/state/workspace-store';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(tool ? 'tools.editTitle' : 'tools.addTitle')}</DialogTitle>
        </DialogHeader>
        {/* 每次打开都以当前条目重新初始化表单。 */}
        {open && <CommandToolForm key={tool?.id ?? 'new'} tool={tool} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CommandToolForm({ tool, onDone }: { tool: CommandTool | null; onDone: () => void }) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const [key, setKey] = useState(tool?.key ?? '');
  const [description, setDescription] = useState(tool?.description ?? '');
  const [tagIds, setTagIds] = useState<string[]>(tool?.tag_ids ?? []);
  const [submitProblem, setSubmitProblem] = useState<OperationProblem | null>(null);
  // 新增时预先取定内部 ID，以便在同一次操作中接着设置标签。
  const [newId] = useState(() => systemContext.newId());

  const operation = (current: Workspace) => {
    const input = { key, description };
    const result = tool
      ? updateCommandTool(current, tool.id, input)
      : addCommandTool(current, input, { ...systemContext, newId: () => newId });
    return 'problem' in result
      ? result
      : setToolTags(result.workspace, { type: 'command', id: tool?.id ?? newId }, tagIds);
  };
  // 操作是纯函数，可以边输入边试算，标识重复时立即提示。空标识只禁用保存，不提示。
  const trial = operation(workspace);
  const liveProblem = 'problem' in trial && trial.problem !== 'keyEmpty' ? trial.problem : null;
  const problem = submitProblem ?? liveProblem;

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
        <Field data-invalid={problem ? true : undefined}>
          <FieldLabel htmlFor="command-tool-key">{t('tools.key')}</FieldLabel>
          <Input
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
              setSubmitProblem(null);
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
        <TagPicker value={tagIds} onChange={setTagIds} />
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
