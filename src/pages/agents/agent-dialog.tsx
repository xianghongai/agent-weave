import { ChevronRightIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { operationProblemMessage } from '@/i18n/problems';
import { type Agent, DECISIONS, type PermissionOutput, type Workspace } from '@/lib/workspace';
import {
  type AgentInput,
  type OperationProblem,
  addAgent,
  newPermissionOutput,
  updateAgent,
} from '@/lib/workspace-operations';
import { ScopeListEditor } from '@/pages/agents/scope-list-editor';
import { TemplatePairFields } from '@/pages/agents/template-pair-fields';
import { runOperation, useWorkspace } from '@/state/workspace-store';

interface AgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 为 `null` 时新增，否则编辑该 Agent。 */
  agent: Agent | null;
}

/**
 * 新增或编辑 Agent 定义。基本信息直接显示，属性路径、决策键名和模板放在“高级”折叠区。
 * 内置工具不在这里编辑，保存时保持不变。
 */
export function AgentDialog({ open, onOpenChange, agent }: AgentDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t(agent ? 'agents.editTitle' : 'agents.addTitle')}</DialogTitle>
        </DialogHeader>
        {/* 每次打开都以当前条目重新初始化表单。 */}
        {open && <AgentForm key={agent?.id ?? 'new'} agent={agent} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

/** 只能在“高级”区修改的字段出错时，自动展开高级区，避免保存按钮无故不可用。 */
const ADVANCED_PROBLEMS: readonly OperationProblem[] = ['propertyPathInvalid', 'decisionKeyDuplicate'];

function AgentForm({ agent, onDone }: { agent: Agent | null; onDone: () => void }) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const [name, setName] = useState(agent?.name ?? '');
  const [description, setDescription] = useState(agent?.description ?? '');
  // 关闭权限输出时保留已填写的内容，重新打开后可以继续使用。
  const [permissionEnabled, setPermissionEnabled] = useState(agent ? agent.permission_output !== null : true);
  const [permission, setPermission] = useState<PermissionOutput>(agent?.permission_output ?? newPermissionOutput());
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitProblem, setSubmitProblem] = useState<OperationProblem | null>(null);

  const input: AgentInput = {
    name,
    description,
    permission_output: permissionEnabled ? permission : null,
    // MCP 输出的编辑随 MCP Server 一起加入，在此之前原样保留。
    mcp_output: agent?.mcp_output ?? null,
  };
  const operation = (current: Workspace) => (agent ? updateAgent(current, agent.id, input) : addAgent(current, input));
  // 操作是纯函数，可以边输入边试算，立即提示重复名称和无效的高级字段。空名称只禁用保存，不提示。
  const trial = operation(workspace);
  const liveProblem = 'problem' in trial && trial.problem !== 'nameEmpty' ? trial.problem : null;
  const problem = submitProblem ?? liveProblem;
  const advancedProblem = problem && ADVANCED_PROBLEMS.includes(problem) ? problem : null;

  function changePermission(changes: Partial<PermissionOutput>) {
    setPermission((current) => ({ ...current, ...changes }));
    setSubmitProblem(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = runOperation(operation);
    if (result) {
      setSubmitProblem(result);
    } else {
      onDone();
    }
  }

  const nameProblem = problem === 'nameDuplicate' || problem === 'notFound' ? problem : null;

  return (
    <form onSubmit={submit} className="grid gap-6">
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
              setSubmitProblem(null);
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
        <Field orientation="horizontal">
          <Switch
            id="agent-permission-enabled"
            className="mt-0.5"
            checked={permissionEnabled}
            onCheckedChange={(checked) => {
              setPermissionEnabled(checked);
              setSubmitProblem(null);
            }}
          />
          <FieldContent>
            <FieldLabel htmlFor="agent-permission-enabled">{t('agents.permissionOutput')}</FieldLabel>
            <FieldDescription>{t('agents.permissionOutputHint')}</FieldDescription>
          </FieldContent>
        </Field>
        {permissionEnabled && (
          <ScopeListEditor
            idPrefix="agent-permission-scope"
            legend={t('agents.permissionScopes')}
            scopes={permission.scopes}
            onChange={(scopes) => changePermission({ scopes })}
          />
        )}
      </FieldGroup>

      {/* 高级区：以后 MCP 输出的风格、属性路径也放在这里，与权限输出并列成一个 FieldSet。 */}
      <Collapsible open={advancedOpen || advancedProblem !== null} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger
          render={
            <Button type="button" variant="ghost" className="group -ml-2.5">
              <ChevronRightIcon className="transition-transform group-data-[panel-open]:rotate-90" />
              {t('agents.advanced')}
              <span className="font-normal text-muted-foreground">{t('agents.advancedHint')}</span>
            </Button>
          }
        />
        <CollapsibleContent className="pt-3">
          {permissionEnabled ? (
            <PermissionAdvancedFields value={permission} onChange={changePermission} problem={advancedProblem} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('agents.noPermissionOutput')}</p>
          )}
        </CollapsibleContent>
      </Collapsible>

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

interface PermissionAdvancedFieldsProps {
  value: PermissionOutput;
  onChange: (changes: Partial<PermissionOutput>) => void;
  problem: OperationProblem | null;
}

/** 权限输出的高级字段：属性路径、决策键名映射、命令工具与 MCP 工具的模板。 */
function PermissionAdvancedFields({ value, onChange, problem }: PermissionAdvancedFieldsProps) {
  const { t } = useTranslation();
  const pathProblem = problem === 'propertyPathInvalid';
  const keyProblem = problem === 'decisionKeyDuplicate';

  return (
    <FieldSet>
      <FieldLegend>{t('agents.permissionOutput')}</FieldLegend>
      <FieldGroup>
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
    </FieldSet>
  );
}
