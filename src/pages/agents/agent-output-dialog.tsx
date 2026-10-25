import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FieldLabelWithHelp } from '@/components/field-label-with-help';
import { FormDialog } from '@/components/form-dialog';
import { MarkdownFieldDescription } from '@/components/markdown-field-description';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type OperationForm, useOperationForm } from '@/hooks/use-operation-form';
import { operationProblemMessage } from '@/i18n/problems';
import { type Agent, DECISIONS, type McpOutput, type McpStyle, type PermissionOutput } from '@/lib/workspace';
import { type OperationProblem, newMcpOutput, newPermissionOutput, updateAgent } from '@/lib/workspace-operations';
import { ScopeListEditor } from '@/pages/agents/scope-list-editor';
import { TemplatePairFields } from '@/pages/agents/template-pair-fields';

/** Agent 的两种输出，各自在单独的对话框中编辑。 */
export type OutputKind = 'permission' | 'mcp';

interface AgentOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  kind: OutputKind;
}

/** 编辑 Agent 的权限输出或 MCP 输出，只修改这一种输出，名称、描述和另一种输出保持不变。 */
export function AgentOutputDialog({ open, onOpenChange, agent, kind }: AgentOutputDialogProps) {
  const { t } = useTranslation();
  const onClose = () => onOpenChange(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="wide"
      title={t(kind === 'permission' ? 'agents.editPermissionTitle' : 'agents.editMcpTitle', { name: agent.name })}
    >
      {/* 每次打开都以当前条目重新初始化表单。 */}
      {open &&
        (kind === 'permission' ? (
          <PermissionOutputForm key={agent.id} agent={agent} onClose={onClose} />
        ) : (
          <McpOutputForm key={agent.id} agent={agent} onClose={onClose} />
        ))}
    </FormDialog>
  );
}

interface AgentOutputFormProps {
  agent: Agent;
  onClose: () => void;
}

function PermissionOutputForm({ agent, onClose }: AgentOutputFormProps) {
  const { t } = useTranslation();
  // 关闭输出时保留已填写的内容，重新打开后可以继续使用。
  const [enabled, setEnabled] = useState(agent.permission_output !== null);
  const [value, setValue] = useState<PermissionOutput>(agent.permission_output ?? newPermissionOutput());
  const form = useOperationForm(
    (current) => updateAgent(current, agent.id, { permission_output: enabled ? value : null }),
    { quiet: () => false, onDone: onClose }
  );

  return (
    <OutputForm
      form={form}
      onClose={onClose}
      toggle={{
        id: 'agent-permission-enabled',
        label: t('agents.permissionOutput'),
        hint: t('agents.permissionOutputHint'),
        checked: enabled,
        onChange: setEnabled,
      }}
    >
      {enabled ? (
        <PermissionFields
          value={value}
          onChange={(changes) => {
            setValue((current) => ({ ...current, ...changes }));
            form.clearSubmitProblem();
          }}
          problem={form.problem}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t('agents.noPermissionOutput')}</p>
      )}
    </OutputForm>
  );
}

function McpOutputForm({ agent, onClose }: AgentOutputFormProps) {
  const { t } = useTranslation();
  // 同权限输出：关闭时保留已填写的内容。
  const [enabled, setEnabled] = useState(agent.mcp_output !== null);
  const [value, setValue] = useState<McpOutput>(agent.mcp_output ?? newMcpOutput());
  const form = useOperationForm((current) => updateAgent(current, agent.id, { mcp_output: enabled ? value : null }), {
    quiet: () => false,
    onDone: onClose,
  });

  return (
    <OutputForm
      form={form}
      onClose={onClose}
      toggle={{
        id: 'agent-mcp-enabled',
        label: t('agents.mcpOutput'),
        hint: t('agents.mcpOutputHint'),
        checked: enabled,
        onChange: setEnabled,
      }}
    >
      {enabled ? (
        <McpFields
          value={value}
          onChange={(changes) => {
            setValue((current) => ({ ...current, ...changes }));
            form.clearSubmitProblem();
          }}
          problem={form.problem}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t('agents.noMcpOutput')}</p>
      )}
    </OutputForm>
  );
}

interface OutputFormProps {
  form: Pick<OperationForm, 'problem' | 'canSubmit' | 'submit'>;
  onClose: () => void;
  /** 整体开启或关闭这种输出的开关。 */
  toggle: { id: string; label: string; hint: string; checked: boolean; onChange: (checked: boolean) => void };
  children: React.ReactNode;
}

/**
 * 两种输出对话框共用的布局：顶部是开关，下面是字段，标题和底部按钮固定，中间内容滚动。
 * Agent 在编辑期间被删除时，在开关下方提示。
 */
function OutputForm({ form, onClose, toggle, children }: OutputFormProps) {
  const { t } = useTranslation();

  return (
    <form onSubmit={form.submit} className="flex min-h-0 flex-col gap-4">
      {/* 两侧伸进对话框的内边距，给滚动条和焦点环留出位置，内容仍与标题对齐。 */}
      <ScrollArea className="-mx-4 flex min-h-0 flex-col">
        <FieldGroup className="px-4 py-1">
          <Field orientation="horizontal" data-invalid={form.problem === 'notFound' ? true : undefined}>
            <Switch id={toggle.id} className="mt-0.5" checked={toggle.checked} onCheckedChange={toggle.onChange} />
            <FieldContent>
              <FieldLabel htmlFor={toggle.id}>{toggle.label}</FieldLabel>
              <FieldDescription>{toggle.hint}</FieldDescription>
              {form.problem === 'notFound' && <FieldError>{operationProblemMessage(t, 'notFound')}</FieldError>}
            </FieldContent>
          </Field>
          {children}
        </FieldGroup>
      </ScrollArea>

      <DialogFooter className="shrink-0">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!form.canSubmit}>
          {t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}

const MCP_STYLES: readonly McpStyle[] = ['json', 'toml'];

interface McpFieldsProps {
  value: McpOutput;
  onChange: (changes: Partial<McpOutput>) => void;
  problem: OperationProblem | null;
}

/** MCP 输出的字段：作用域、风格与属性路径。 */
function McpFields({ value, onChange, problem }: McpFieldsProps) {
  const { t } = useTranslation();
  const pathProblem = problem === 'mcpPropertyPathInvalid';

  return (
    <FieldGroup>
      <ScopeListEditor
        idPrefix="agent-mcp-scope"
        legend={t('agents.scopes')}
        scopes={value.scopes}
        onChange={(scopes) => onChange({ scopes })}
      />
      <Field>
        <FieldLabelWithHelp
          id="agent-mcp-style-label"
          help={{ label: t('agents.mcpStyleHelp'), content: t('agents.mcpStyleHint') }}
        >
          {t('agents.mcpStyle')}
        </FieldLabelWithHelp>
        {/* 只用 Tab 列表做分段选择，没有对应的面板。 */}
        <Tabs
          value={value.style}
          onValueChange={(next) => {
            // 受控且只接受已知风格；Base UI 自动回退时给出的 `null` 不覆盖已有的选择。
            const style = MCP_STYLES.find((candidate) => candidate === next);
            if (style) {
              onChange({ style });
            }
          }}
        >
          <TabsList aria-labelledby="agent-mcp-style-label">
            {MCP_STYLES.map((style) => (
              <TabsTrigger key={style} value={style} className="px-3">
                {t(`agents.mcpStyles.${style}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Field>
      <Field data-invalid={pathProblem ? true : undefined}>
        <FieldLabel htmlFor="agent-mcp-path">{t('agents.propertyPath')}</FieldLabel>
        <Input
          id="agent-mcp-path"
          value={value.property_path}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          aria-invalid={pathProblem ? true : undefined}
          onChange={(event) => onChange({ property_path: event.target.value })}
        />
        {pathProblem ? (
          <FieldError>{operationProblemMessage(t, 'mcpPropertyPathInvalid')}</FieldError>
        ) : (
          <MarkdownFieldDescription>{t('agents.mcpPropertyPathHint')}</MarkdownFieldDescription>
        )}
      </Field>
    </FieldGroup>
  );
}

interface PermissionFieldsProps {
  value: PermissionOutput;
  onChange: (changes: Partial<PermissionOutput>) => void;
  problem: OperationProblem | null;
}

/** 权限输出的字段：作用域、属性路径、决策键名映射、命令工具与 MCP 工具的模板。 */
function PermissionFields({ value, onChange, problem }: PermissionFieldsProps) {
  const { t } = useTranslation();
  const pathProblem = problem === 'propertyPathInvalid';
  const keyProblem = problem === 'decisionKeyDuplicate';

  return (
    <FieldGroup>
      <ScopeListEditor
        idPrefix="agent-permission-scope"
        legend={t('agents.scopes')}
        scopes={value.scopes}
        onChange={(scopes) => onChange({ scopes })}
      />
      <Field data-invalid={pathProblem ? true : undefined}>
        <FieldLabel htmlFor="agent-permission-path">{t('agents.propertyPath')}</FieldLabel>
        <Input
          id="agent-permission-path"
          value={value.property_path}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          aria-invalid={pathProblem ? true : undefined}
          onChange={(event) => onChange({ property_path: event.target.value })}
        />
        {pathProblem ? (
          <FieldError>{operationProblemMessage(t, 'propertyPathInvalid')}</FieldError>
        ) : (
          <MarkdownFieldDescription>{t('agents.propertyPathHint')}</MarkdownFieldDescription>
        )}
      </Field>

      <FieldSet data-invalid={keyProblem ? true : undefined} className="gap-3">
        <FieldLegend variant="label">{t('agents.decisionKeys')}</FieldLegend>
        <FieldDescription>{t('agents.decisionKeysHint')}</FieldDescription>
        <div className="grid gap-3 sm:grid-cols-3">
          {DECISIONS.map((decision) => (
            <Field key={decision}>
              <FieldLabel htmlFor={`agent-decision-key-${decision}`}>{t(`decisions.${decision}`)}</FieldLabel>
              <Input
                id={`agent-decision-key-${decision}`}
                value={value.decision_keys[decision]}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
                placeholder={t('agents.decisionKeyPlaceholder')}
                aria-invalid={keyProblem ? true : undefined}
                onChange={(event) =>
                  onChange({ decision_keys: { ...value.decision_keys, [decision]: event.target.value } })
                }
              />
            </Field>
          ))}
        </div>
        {keyProblem && <FieldError>{operationProblemMessage(t, 'decisionKeyDuplicate')}</FieldError>}
      </FieldSet>

      <TemplatePairFields
        idPrefix="agent-command-template"
        legend={t('agents.commandTemplates')}
        help={{ with: t('agents.templateHelp.commandWith'), without: t('agents.templateHelp.commandWithout') }}
        value={value.command_templates}
        onChange={(command_templates) => onChange({ command_templates })}
      />
      <TemplatePairFields
        idPrefix="agent-mcp-template"
        legend={t('agents.mcpTemplates')}
        help={{ with: t('agents.templateHelp.mcpWith'), without: t('agents.templateHelp.mcpWithout') }}
        value={value.mcp_templates}
        onChange={(mcp_templates) => onChange({ mcp_templates })}
      />
    </FieldGroup>
  );
}
