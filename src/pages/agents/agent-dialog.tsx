import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useOperationForm } from '@/hooks/use-operation-form';
import { operationProblemMessage } from '@/i18n/problems';
import type { Agent, Workspace } from '@/lib/workspace';
import { addAgent, updateAgent } from '@/lib/workspace-operations';

interface AgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 为 `null` 时新增，否则编辑该 Agent。 */
  agent: Agent | null;
  /** 新增成功后调用，页面用它选中新的 Agent。 */
  onAdded: () => void;
}

/**
 * 新增 Agent 或编辑它的基础信息（名称、描述）。
 * 新增时只填基础信息即可创建，权限输出和 MCP 输出之后在 Agent 页各自的对话框中补充。
 */
export function AgentDialog({ open, onOpenChange, agent, onAdded }: AgentDialogProps) {
  const { t } = useTranslation();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="narrow"
      title={t(agent ? 'agents.editTitle' : 'agents.addTitle')}
    >
      {/* 每次打开都以当前条目重新初始化表单。 */}
      {open && (
        <AgentForm key={agent?.id ?? 'new'} agent={agent} onClose={() => onOpenChange(false)} onAdded={onAdded} />
      )}
    </FormDialog>
  );
}

interface AgentFormProps {
  agent: Agent | null;
  onClose: () => void;
  onAdded: () => void;
}

function AgentForm({ agent, onClose, onAdded }: AgentFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(agent?.name ?? '');
  const [description, setDescription] = useState(agent?.description ?? '');

  const operation = (current: Workspace) => {
    const input = { name, description };
    return agent ? updateAgent(current, agent.id, input) : addAgent(current, input);
  };
  // 重复名称立即提示；空名称只禁用保存，不提示。
  const { problem, canSubmit, submit, clearSubmitProblem } = useOperationForm(operation, {
    quiet: (candidate) => candidate === 'nameEmpty',
    onDone: () => {
      if (!agent) {
        onAdded();
      }
      onClose();
    },
  });

  // 只在名称框显示与名称有关的原因；另外两种输出不在这里编辑。
  const nameProblem = problem === 'nameDuplicate' || problem === 'notFound' ? problem : null;

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FieldGroup>
        <Field data-invalid={nameProblem ? true : undefined}>
          <FieldLabel htmlFor="agent-name">{t('agents.name')}</FieldLabel>
          <Input
            id="agent-name"
            value={name}
            autoFocus
            autoComplete="off"
            placeholder={t('agents.namePlaceholder')}
            aria-invalid={nameProblem ? true : undefined}
            onChange={(event) => {
              setName(event.target.value);
              clearSubmitProblem();
            }}
          />
          {nameProblem && <FieldError>{operationProblemMessage(t, nameProblem)}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="agent-description">{t('agents.description')}</FieldLabel>
          <Input
            id="agent-description"
            value={description}
            autoComplete="off"
            placeholder={t('common.optional')}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        {!agent && <FieldDescription>{t('agents.addHint')}</FieldDescription>}
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
