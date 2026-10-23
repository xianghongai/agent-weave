import { cn } from 'cn';
import { CircleSlashIcon, FileCodeIcon, FolderOpenIcon, InfoIcon, PlugIcon, ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CopyButton } from '@/components/copy-button';
import { DECISION_TONE } from '@/components/decision-tone';
import { Note, Page } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { skipReasonMessage } from '@/i18n/problems';
import { type McpSection, type Notice, type PermissionSection, type SkippedRule, generate } from '@/lib/generate';
import { EMPTY_DEVICE_SETTINGS, type Scope, type Workspace } from '@/lib/workspace';
import { resolveTool } from '@/lib/workspace-operations';
import { RuleNoticeList } from '@/pages/output/rule-notice-list';
import { ToolTypeBadge } from '@/pages/rules/rule-fields';
import { useWorkspace } from '@/state/workspace-store';

export default function OutputPage() {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 所选 Agent 不存在（首次打开或已被删除）时，回到第一个 Agent。
  const agent = workspace.agents.find((candidate) => candidate.id === selectedId) ?? workspace.agents[0];
  // 本机设置随路径占位符一起接入，在此之前按未填写处理。
  const output = agent ? generate(workspace, agent.id, EMPTY_DEVICE_SETTINGS) : null;

  return (
    <Page icon={FileCodeIcon} title={t('pages.output.title')} description={t('pages.output.description')}>
      {!agent || !output ? (
        <Note icon={InfoIcon}>{t('output.noAgents')}</Note>
      ) : (
        <div className="grid gap-6">
          <Tabs value={agent.id} onValueChange={(value: string) => setSelectedId(value)}>
            <TabsList className="max-w-full overflow-x-auto">
              {workspace.agents.map((candidate) => (
                <TabsTrigger key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* 复制前最后检查一遍：高危与冲突提示放在输出之前。 */}
          <RuleNoticeList workspace={workspace} notices={output.notices} />

          <section className="grid gap-3">
            <h2 className="flex items-center gap-2 font-medium">
              <ShieldCheckIcon className="size-4 text-brand" />
              {t('output.permission')}
            </h2>
            {output.permission ? (
              <PermissionOutputView
                section={output.permission}
                lastKey={agent.permission_output?.property_path.split('.').at(-1) ?? ''}
              />
            ) : (
              <Note icon={InfoIcon}>{t('output.noPermission')}</Note>
            )}
          </section>

          <section className="grid gap-3">
            <h2 className="flex items-center gap-2 font-medium">
              <PlugIcon className="size-4 text-brand" />
              {t('output.mcp')}
            </h2>
            {output.mcp ? (
              <McpOutputView
                section={output.mcp}
                lastKey={agent.mcp_output?.property_path.split('.').at(-1) ?? ''}
                workspace={workspace}
                notices={output.notices}
              />
            ) : (
              <Note icon={InfoIcon}>{t('output.noMcp')}</Note>
            )}
          </section>

          <SkippedRuleList workspace={workspace} skippedRules={output.skippedRules} />
        </div>
      )}
    </Page>
  );
}

/** 跳过的规则：该 Agent 定义表达不了的规则，附带原因。没有时不显示。 */
function SkippedRuleList({ workspace, skippedRules }: { workspace: Workspace; skippedRules: SkippedRule[] }) {
  const { t } = useTranslation();
  if (skippedRules.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h2 className="flex items-center gap-2 font-medium">
          <CircleSlashIcon className="size-4 text-brand" />
          {t('output.skippedRules')}
          <Badge variant="secondary">{skippedRules.length}</Badge>
        </h2>
        <p className="text-sm text-muted-foreground">{t('output.skippedRulesHint')}</p>
      </div>
      <ul className="divide-y rounded-xl border">
        {skippedRules.map(({ ruleId, reason }) => {
          const rule = workspace.rules.find((candidate) => candidate.id === ruleId);
          const tool = rule ? resolveTool(workspace, rule.tool) : null;
          if (!rule || !tool) {
            return null;
          }
          return (
            <li key={ruleId} className="grid gap-1 px-3 py-2">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                <code className="font-mono font-medium">{tool.tool.key}</code>
                <ToolTypeBadge type={tool.type} />
                {rule.pattern ? (
                  <code className="font-mono break-all">{rule.pattern}</code>
                ) : (
                  <span className="text-muted-foreground">{t('rules.wholeTool')}</span>
                )}
                <span className={cn('font-medium', DECISION_TONE[rule.decision])}>
                  {t(`decisions.${rule.decision}`)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{skipReasonMessage(t, reason, rule)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PermissionOutputView({ section, lastKey }: { section: PermissionSection; lastKey: string }) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3">
      <ScopeList scopes={section.scopes} />

      <div className="overflow-hidden rounded-xl border">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-3 py-2">
          <span className="mr-auto text-sm font-medium">{t('output.preview')}</span>
          {section.decisions.map((decision) => (
            <CopyButton
              key={decision.decision}
              text={decision.copyInnerText}
              disabled={decision.entries.length === 0}
              label={`${t('copy.copyInner')} · ${decision.key}`}
              className={cn(DECISION_TONE[decision.decision])}
              title={t('output.entryCount', { n: decision.entries.length })}
            />
          ))}
          <CopyButton text={section.copyText} label={t('copy.copy')} variant="default" />
        </div>
        <pre className="max-h-[32rem] overflow-auto p-3 font-mono text-xs leading-relaxed sm:text-sm">
          {section.preview}
        </pre>
      </div>

      <p className="text-sm text-muted-foreground text-pretty">{t('output.copyHint', { key: `"${lastKey}"` })}</p>
    </div>
  );
}

/** MCP 节：“复制”整段覆盖；JSON 风格另有“复制内部”，只复制各 Server 的键值对。TOML 风格附带跳过的字段。 */
function McpOutputView({
  section,
  lastKey,
  workspace,
  notices,
}: {
  section: McpSection;
  lastKey: string;
  workspace: Workspace;
  notices: Notice[];
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3">
      <ScopeList scopes={section.scopes} />

      <div className="overflow-hidden rounded-xl border">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-3 py-2">
          <span className="mr-auto text-sm font-medium">{t('output.preview')}</span>
          {section.copyInnerText !== null && (
            <CopyButton
              text={section.copyInnerText}
              disabled={section.copyInnerText === ''}
              label={t('copy.copyInner')}
            />
          )}
          <CopyButton text={section.copyText} label={t('copy.copy')} variant="default" />
        </div>
        <pre className="max-h-[32rem] overflow-auto p-3 font-mono text-xs leading-relaxed sm:text-sm">
          {section.preview}
        </pre>
      </div>

      <p className="text-sm text-muted-foreground text-pretty">
        {section.style === 'json' ? t('output.mcpCopyHint', { key: `"${lastKey}"` }) : t('output.mcpTomlCopyHint')}
      </p>

      <TomlSkippedFieldList workspace={workspace} notices={notices} />
    </div>
  );
}

/** TOML 表达不了而被跳过的字段，按 Server 标识与字段路径列出。没有时不显示。 */
function TomlSkippedFieldList({ workspace, notices }: { workspace: Workspace; notices: Notice[] }) {
  const { t } = useTranslation();
  const fields = notices.flatMap((notice) => {
    if (notice.type !== 'tomlFieldSkipped') {
      return [];
    }
    const server = workspace.mcp_servers.find((candidate) => candidate.id === notice.serverId);
    return server ? [{ id: `${notice.serverId}:${notice.field}`, server: server.key, field: notice.field }] : [];
  });
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-xl border p-3 text-sm">
      <span className="flex items-center gap-2 font-medium">
        <CircleSlashIcon className="size-4 text-brand" />
        {t('output.tomlFieldSkipped')}
        <Badge variant="secondary">{fields.length}</Badge>
      </span>
      <p className="text-muted-foreground">{t('output.tomlFieldSkippedHint')}</p>
      <ul className="grid gap-1">
        {fields.map(({ id, server, field }) => (
          <li key={id}>
            <code className="font-mono break-all">
              {server} · {field}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 作用域只作提示：告诉用户把输出粘贴到哪个文件。 */
function ScopeList({ scopes }: { scopes: Scope[] }) {
  const { t } = useTranslation();
  if (scopes.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-xl bg-muted p-3 text-sm">
      <span className="flex items-center gap-2 font-medium">
        <FolderOpenIcon className="size-4 text-brand" />
        {t('output.scopes')}
      </span>
      <ul className="grid gap-1.5">
        {scopes.map((scope) => (
          <li key={`${scope.name}:${scope.path}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-muted-foreground">{scope.name}</span>
            <code className="font-mono break-all">{scope.path}</code>
            {scope.note && <span className="text-muted-foreground">{scope.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
