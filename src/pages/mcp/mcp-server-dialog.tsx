import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { operationProblemMessage } from '@/i18n/problems';
import type { McpServer, Workspace } from '@/lib/workspace';
import { type OperationProblem, addMcpServer, updateMcpServer } from '@/lib/workspace-operations';
import { runOperation, useWorkspace } from '@/state/workspace-store';

interface McpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 为 `null` 时新增，否则编辑该 MCP Server。 */
  server: McpServer | null;
}

/** 新增或编辑 MCP Server。标识重复或内容不是 JSON 对象时显示原因，不关闭对话框。 */
export function McpServerDialog({ open, onOpenChange, server }: McpServerDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t(server ? 'mcp.editTitle' : 'mcp.addTitle')}</DialogTitle>
        </DialogHeader>
        {/* 每次打开都以当前条目重新初始化表单。 */}
        {open && <McpServerForm key={server?.id ?? 'new'} server={server} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

const CONTENT_PLACEHOLDER = '{\n  "command": "npx",\n  "args": ["-y", "@upstash/context7-mcp"]\n}';

function McpServerForm({ server, onDone }: { server: McpServer | null; onDone: () => void }) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const [key, setKey] = useState(server?.key ?? '');
  const [content, setContent] = useState(server ? JSON.stringify(server.content, null, 2) : '');
  const [description, setDescription] = useState(server?.description ?? '');
  const [submitProblem, setSubmitProblem] = useState<OperationProblem | null>(null);

  const operation = (current: Workspace) => {
    const input = { key, content, description };
    return server ? updateMcpServer(current, server.id, input) : addMcpServer(current, input);
  };
  // 操作是纯函数，可以边输入边试算，立即提示重复标识和无效内容。空标识、空内容只禁用保存，不提示。
  const trial = operation(workspace);
  const liveProblem =
    'problem' in trial && trial.problem !== 'keyEmpty' && !(trial.problem === 'contentInvalid' && content.trim() === '')
      ? trial.problem
      : null;
  const problem = submitProblem ?? liveProblem;
  const keyProblem = problem && problem !== 'contentInvalid' ? problem : null;
  const contentProblem = problem === 'contentInvalid' ? problem : null;

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
          <FieldLabel htmlFor="mcp-server-key">{t('mcp.key')}</FieldLabel>
          <Input
            id="mcp-server-key"
            value={key}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder={t('mcp.keyPlaceholder')}
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
            <FieldDescription>{t('mcp.keyHint')}</FieldDescription>
          )}
        </Field>
        <Field data-invalid={contentProblem ? true : undefined}>
          <FieldLabel htmlFor="mcp-server-content">{t('mcp.content')}</FieldLabel>
          <Textarea
            id="mcp-server-content"
            value={content}
            spellCheck={false}
            placeholder={CONTENT_PLACEHOLDER}
            aria-invalid={contentProblem ? true : undefined}
            className="max-h-80 min-h-32 font-mono text-xs sm:text-sm"
            onChange={(event) => {
              setContent(event.target.value);
              setSubmitProblem(null);
            }}
          />
          {contentProblem ? (
            <FieldError>{operationProblemMessage(t, contentProblem)}</FieldError>
          ) : (
            <FieldDescription>{t('mcp.contentHint')}</FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="mcp-server-description">{t('mcp.description')}</FieldLabel>
          <Input
            id="mcp-server-description"
            value={description}
            autoComplete="off"
            placeholder={t('common.optional')}
            onChange={(event) => setDescription(event.target.value)}
          />
          <FieldDescription>{t('mcp.descriptionHint')}</FieldDescription>
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
