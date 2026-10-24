import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemDescription, ItemHeader, ItemTitle } from '@/components/ui/item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useOperationForm } from '@/hooks/use-operation-form';
import { operationProblemMessage } from '@/i18n/problems';
import {
  type Agent,
  DECISIONS,
  type McpOutput,
  type McpStyle,
  type PermissionOutput,
  type Workspace,
} from '@/lib/workspace';
import {
  type AgentInput,
  type OperationProblem,
  addAgent,
  newMcpOutput,
  newPermissionOutput,
  updateAgent,
} from '@/lib/workspace-operations';
import { ScopeListEditor } from '@/pages/agents/scope-list-editor';
import { TemplatePairFields } from '@/pages/agents/template-pair-fields';

interface AgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 为 `null` 时新增，否则编辑该 Agent。 */
  agent: Agent | null;
  /** 新增成功后调用，页面用它选中新的 Agent。 */
  onAdded: () => void;
}

/**
 * 新增或编辑 Agent 定义，分为基础信息、权限输出、MCP 输出三节。
 * 标题和底部按钮固定，中间内容滚动。内置工具不在这里编辑，保存时保持不变。
 */
export function AgentDialog({ open, onOpenChange, agent, onAdded }: AgentDialogProps) {
  const { t } = useTranslation();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="wide"
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
  // 关闭权限输出时保留已填写的内容，重新打开后可以继续使用。
  const [permissionEnabled, setPermissionEnabled] = useState(agent ? agent.permission_output !== null : true);
  const [permission, setPermission] = useState<PermissionOutput>(agent?.permission_output ?? newPermissionOutput());
  // MCP 输出同理：关闭时保留已填写的内容。
  const [mcpEnabled, setMcpEnabled] = useState(agent ? agent.mcp_output !== null : true);
  const [mcp, setMcp] = useState<McpOutput>(agent?.mcp_output ?? newMcpOutput());

  const input: AgentInput = {
    name,
    description,
    permission_output: permissionEnabled ? permission : null,
    mcp_output: mcpEnabled ? mcp : null,
  };
  const operation = (current: Workspace) => (agent ? updateAgent(current, agent.id, input) : addAgent(current, input));
  // 重复名称和无效的输出字段立即提示；空名称只禁用保存，不提示。
  const { problem, canSubmit, submit, clearSubmitProblem } = useOperationForm(operation, {
    quiet: (candidate) => candidate === 'nameEmpty',
    onDone: () => {
      if (!agent) {
        onAdded();
      }
      onClose();
    },
  });

  function changePermission(changes: Partial<PermissionOutput>) {
    setPermission((current) => ({ ...current, ...changes }));
    clearSubmitProblem();
  }

  function changeMcp(changes: Partial<McpOutput>) {
    setMcp((current) => ({ ...current, ...changes }));
    clearSubmitProblem();
  }

  const nameProblem = problem === 'nameDuplicate' || problem === 'notFound' ? problem : null;

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-col gap-4">
      {/* 两侧伸进对话框的内边距，给滚动条和焦点环留出位置，内容仍与标题对齐。 */}
      <ScrollArea className="-mx-4 flex min-h-0 flex-col">
        <div className="grid gap-4 px-4 py-1">
          <DialogSection id="agent-section-basic" title={t('agents.basicSection')}>
            <FieldGroup className="sm:grid sm:grid-cols-2">
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
            </FieldGroup>
          </DialogSection>

          <DialogSection
            id="agent-section-permission"
            title={t('agents.permissionSection')}
            hint={t('agents.permissionOutputHint')}
            toggle={{
              label: t('agents.permissionOutput'),
              checked: permissionEnabled,
              onChange: (checked) => {
                setPermissionEnabled(checked);
                clearSubmitProblem();
              },
            }}
          >
            {permissionEnabled ? (
              <PermissionFields value={permission} onChange={changePermission} problem={problem} />
            ) : (
              <p className="text-sm text-muted-foreground">{t('agents.noPermissionOutput')}</p>
            )}
          </DialogSection>

          <DialogSection
            id="agent-section-mcp"
            title={t('agents.mcpSection')}
            hint={t('agents.mcpOutputHint')}
            toggle={{
              label: t('agents.mcpOutput'),
              checked: mcpEnabled,
              onChange: (checked) => {
                setMcpEnabled(checked);
                clearSubmitProblem();
              },
            }}
          >
            {mcpEnabled ? (
              <McpFields value={mcp} onChange={changeMcp} problem={problem} />
            ) : (
              <p className="text-sm text-muted-foreground">{t('agents.noMcpOutput')}</p>
            )}
          </DialogSection>
        </div>
      </ScrollArea>

      <DialogFooter className="shrink-0">
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

interface DialogSectionProps {
  id: string;
  title: string;
  hint?: string;
  /** 节标题旁的开关，用于整节开启或关闭的输出。 */
  toggle?: { label: string; checked: boolean; onChange: (checked: boolean) => void };
  children: React.ReactNode;
}

/** 对话框中的一节：标题行（可带说明和开关），下面是这一节的字段。 */
function DialogSection({ id, title, hint, toggle, children }: DialogSectionProps) {
  return (
    <Item variant="outline" className="gap-4 p-4" render={<section aria-labelledby={`${id}-title`} />}>
      <ItemHeader className="items-start">
        <ItemContent>
          <ItemTitle id={`${id}-title`} className="text-base">
            {title}
          </ItemTitle>
          {hint && <ItemDescription>{hint}</ItemDescription>}
        </ItemContent>
        {toggle && (
          <ItemActions>
            <Switch aria-label={toggle.label} checked={toggle.checked} onCheckedChange={toggle.onChange} />
          </ItemActions>
        )}
      </ItemHeader>
      <div className="basis-full">{children}</div>
    </Item>
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
        <FieldLabel>{t('agents.mcpStyle')}</FieldLabel>
        <ToggleGroup
          variant="outline"
          value={[value.style]}
          onValueChange={(next) => {
            // 单选；再次点击当前项会得到空数组，此时保持原风格。
            const style = MCP_STYLES.find((candidate) => next.includes(candidate));
            if (style) {
              onChange({ style });
            }
          }}
          aria-label={t('agents.mcpStyle')}
        >
          {MCP_STYLES.map((style) => (
            <ToggleGroupItem key={style} value={style}>
              {t(`agents.mcpStyles.${style}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>{t('agents.mcpStyleHint')}</FieldDescription>
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
          <FieldDescription>{t('agents.mcpPropertyPathHint')}</FieldDescription>
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
          <FieldDescription>{t('agents.propertyPathHint')}</FieldDescription>
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
        hint={t('agents.commandTemplatesHint')}
        value={value.command_templates}
        onChange={(command_templates) => onChange({ command_templates })}
      />
      <TemplatePairFields
        idPrefix="agent-mcp-template"
        legend={t('agents.mcpTemplates')}
        hint={t('agents.mcpTemplatesHint')}
        value={value.mcp_templates}
        onChange={(mcp_templates) => onChange({ mcp_templates })}
      />
    </FieldGroup>
  );
}
