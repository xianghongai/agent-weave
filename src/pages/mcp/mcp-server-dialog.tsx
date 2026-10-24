import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CodeEditor, type CodeEditorHandle } from '@/components/code-editor';
import { FormDialog } from '@/components/form-dialog';
import { HighRiskSwitch } from '@/components/high-risk';
import { Markdown } from '@/components/markdown';
import { TagPicker } from '@/components/tag-picker';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useOperationForm } from '@/hooks/use-operation-form';
import { operationProblemMessage } from '@/i18n/problems';
import type { McpServer, Workspace } from '@/lib/workspace';
import { addMcpServer, updateMcpServer } from '@/lib/workspace-operations';

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
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="wide"
      title={t(server ? 'mcp.editTitle' : 'mcp.addTitle')}
    >
      {/* 每次打开都以当前条目重新初始化表单。 */}
      {open && <McpServerForm key={server?.id ?? 'new'} server={server} onDone={() => onOpenChange(false)} />}
    </FormDialog>
  );
}

const CONTENT_PLACEHOLDER = '{\n  "command": "npx",\n  "args": ["-y", "@upstash/context7-mcp"]\n}';

function McpServerForm({ server, onDone }: { server: McpServer | null; onDone: () => void }) {
  const { t } = useTranslation();
  const [key, setKey] = useState(server?.key ?? '');
  const [content, setContent] = useState(server ? JSON.stringify(server.content, null, 2) : '');
  const [description, setDescription] = useState(server?.description ?? '');
  const [highRisk, setHighRisk] = useState(server?.high_risk ?? false);
  const [tagIds, setTagIds] = useState<string[]>(server?.tag_ids ?? []);
  const contentEditorRef = useRef<CodeEditorHandle>(null);

  const operation = (current: Workspace) => {
    const input = { key, content, description, high_risk: highRisk, tag_ids: tagIds };
    return server ? updateMcpServer(current, server.id, input) : addMcpServer(current, input);
  };
  // 重复标识和无效内容立即提示；空标识、空内容只禁用保存，不提示。
  const { problem, canSubmit, submit, clearSubmitProblem } = useOperationForm(operation, {
    quiet: (candidate) => candidate === 'keyEmpty' || (candidate === 'contentInvalid' && content.trim() === ''),
    onDone,
  });
  const keyProblem = problem && problem !== 'contentInvalid' ? problem : null;
  const contentProblem = problem === 'contentInvalid' ? problem : null;

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
              clearSubmitProblem();
            }}
          />
          {keyProblem ? (
            <FieldError>{operationProblemMessage(t, keyProblem)}</FieldError>
          ) : (
            <FieldDescription>{t('mcp.keyHint')}</FieldDescription>
          )}
        </Field>
        <Field data-invalid={contentProblem ? true : undefined}>
          {/* 编辑区域不是表单控件，htmlFor 对它无效：名称由 aria-labelledby 关联，点击标签时手动聚焦。 */}
          <FieldLabel id="mcp-server-content-label" onClick={() => contentEditorRef.current?.focus()}>
            {t('mcp.content')}
          </FieldLabel>
          <CodeEditor
            ref={contentEditorRef}
            id="mcp-server-content"
            labelId="mcp-server-content-label"
            describedBy={contentProblem ? 'mcp-server-content-error' : 'mcp-server-content-hint'}
            invalid={contentProblem !== null}
            language="json"
            value={content}
            placeholder={CONTENT_PLACEHOLDER}
            onChange={(value) => {
              setContent(value);
              clearSubmitProblem();
            }}
          />
          {contentProblem ? (
            <FieldError id="mcp-server-content-error">{operationProblemMessage(t, contentProblem)}</FieldError>
          ) : (
            // 说明含代码，用 Markdown 渲染；FieldDescription 是段落，放不下 Markdown 输出的块级元素。
            <div id="mcp-server-content-hint" className="text-sm leading-normal text-muted-foreground">
              <Markdown>{t('mcp.contentHint')}</Markdown>
            </div>
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
        <HighRiskSwitch
          id="mcp-server-high-risk"
          checked={highRisk}
          onCheckedChange={setHighRisk}
          hint={t('notices.toolHighRiskHint')}
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
