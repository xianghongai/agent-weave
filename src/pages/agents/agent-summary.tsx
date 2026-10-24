import type { LucideIcon } from 'lucide-react';
import { PlugIcon, ShieldCheckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Item, ItemHeader, ItemTitle } from '@/components/ui/item';
import {
  type Agent,
  DECISIONS,
  type McpOutput,
  type PermissionOutput,
  type Scope,
  type TemplatePair,
} from '@/lib/workspace';

/** Agent 定义的只读摘要：权限输出与 MCP 输出各一节，宽屏下并排。 */
export function AgentSummary({ agent }: { agent: Agent }) {
  const { t } = useTranslation();

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <SummarySection id={`agent-${agent.id}-permission`} icon={ShieldCheckIcon} title={t('agents.permissionSection')}>
        {agent.permission_output ? (
          <PermissionSummary output={agent.permission_output} />
        ) : (
          <p className="text-muted-foreground">{t('agents.noPermissionOutput')}</p>
        )}
      </SummarySection>
      <SummarySection id={`agent-${agent.id}-mcp`} icon={PlugIcon} title={t('agents.mcpSection')}>
        {agent.mcp_output ? (
          <McpSummary output={agent.mcp_output} />
        ) : (
          <p className="text-muted-foreground">{t('agents.noMcpOutput')}</p>
        )}
      </SummarySection>
    </div>
  );
}

function SummarySection({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Item variant="outline" className="gap-3 p-4" render={<section aria-labelledby={`${id}-title`} />}>
      <ItemHeader>
        <ItemTitle id={`${id}-title`}>
          <Icon className="size-4 text-brand" />
          {title}
        </ItemTitle>
      </ItemHeader>
      <div className="basis-full text-sm">{children}</div>
    </Item>
  );
}

function PermissionSummary({ output }: { output: PermissionOutput }) {
  const { t } = useTranslation();

  return (
    <SummaryList>
      <SummaryRow label={t('agents.scopes')}>
        <ScopeSummary scopes={output.scopes} />
      </SummaryRow>
      <SummaryRow label={t('agents.propertyPath')}>
        <Code>{output.property_path}</Code>
      </SummaryRow>
      <SummaryRow label={t('agents.decisionKeys')}>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {DECISIONS.map((decision) => (
            <li key={decision} className="flex items-baseline gap-1.5">
              <span className="text-muted-foreground">{t(`decisions.${decision}`)}</span>
              {output.decision_keys[decision] ? (
                <Code>{output.decision_keys[decision]}</Code>
              ) : (
                <span>{t('agents.decisionKeyUnsupported')}</span>
              )}
            </li>
          ))}
        </ul>
      </SummaryRow>
      <SummaryRow label={t('agents.commandTemplates')}>
        <TemplateSummary value={output.command_templates} />
      </SummaryRow>
      <SummaryRow label={t('agents.mcpTemplates')}>
        <TemplateSummary value={output.mcp_templates} />
      </SummaryRow>
    </SummaryList>
  );
}

function McpSummary({ output }: { output: McpOutput }) {
  const { t } = useTranslation();

  return (
    <SummaryList>
      <SummaryRow label={t('agents.scopes')}>
        <ScopeSummary scopes={output.scopes} />
      </SummaryRow>
      <SummaryRow label={t('agents.mcpStyle')}>{t(`agents.mcpStyles.${output.style}`)}</SummaryRow>
      <SummaryRow label={t('agents.propertyPath')}>
        <Code>{output.property_path}</Code>
      </SummaryRow>
    </SummaryList>
  );
}

/** 标签与值两列；窄屏下标签在上、值在下。 */
function SummaryList({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-[auto_1fr]">{children}</dl>;
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-0.5 sm:col-span-2 sm:grid-cols-subgrid">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function ScopeSummary({ scopes }: { scopes: Scope[] }) {
  const { t } = useTranslation();
  if (scopes.length === 0) {
    return <span className="text-muted-foreground">{t('agents.noScopes')}</span>;
  }

  return (
    <ul className="grid gap-1">
      {scopes.map((scope) => (
        <li key={`${scope.name}:${scope.path}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span>{scope.name}</span>
          <Code>{scope.path}</Code>
          {scope.note && <span className="text-muted-foreground">{scope.note}</span>}
        </li>
      ))}
    </ul>
  );
}

/** 有模式与无模式两个模板；为空的模板显示“未填写”。 */
function TemplateSummary({ value }: { value: TemplatePair }) {
  const { t } = useTranslation();
  const templates = [
    { key: 'with', label: t('agents.withPattern'), template: value.with_pattern },
    { key: 'without', label: t('agents.withoutPattern'), template: value.without_pattern },
  ];

  return (
    <ul className="grid gap-1">
      {templates.map(({ key, label, template }) => (
        <li key={key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-muted-foreground">{label}</span>
          {template ? <Code>{template}</Code> : <span>{t('agents.templateEmpty')}</span>}
        </li>
      ))}
    </ul>
  );
}

function Code({ children }: { children: string }) {
  return <code className="font-mono break-all">{children}</code>;
}
