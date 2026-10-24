import { cn } from 'cn';
import { CircleSlashIcon, FileCodeIcon, FolderOpenIcon, InfoIcon, PlugIcon, ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AgentTabs } from '@/components/agent-tabs';
import { CodeView } from '@/components/code-view';
import { CopyButton } from '@/components/copy-button';
import { DECISION_TONE } from '@/components/decision-tone';
import { Note, Page, PageScroll } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { skipReasonMessage } from '@/i18n/problems';
import { type McpSection, type PermissionSection, type SkippedRule, generate } from '@/lib/generate';
import type { Notice } from '@/lib/notices';
import type { Scope, Workspace } from '@/lib/workspace';
import { findSelectedAgent, resolveTool } from '@/lib/workspace-operations';
import { PlaceholderNotice } from '@/pages/output/placeholder-notice';
import { RuleNoticeList } from '@/pages/output/rule-notice-list';
import { ToolTypeBadge } from '@/pages/rules/rule-fields';
import { useAppStore } from '@/state/app-store';
import { useUiStore } from '@/state/ui-store';

/** 内层 Tab：权限输出或 MCP 输出。 */
type OutputTab = 'permission' | 'mcp';

export default function OutputPage() {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const device = useAppStore((state) => state.deviceSettings);
  const selectedId = useUiStore((state) => state.selectedAgentId);
  // 页面局部状态：切换 Agent 时保持不变，离开页面后重置。
  const [tab, setTab] = useState<OutputTab>('permission');

  const agent = findSelectedAgent(workspace, selectedId);
  const output = agent ? generate(workspace, agent.id, device) : null;

  return (
    <Page
      icon={FileCodeIcon}
      title={t('pages.output.title')}
      description={t('pages.output.description')}
      scroll="custom"
    >
      {!agent || !output ? (
        <Note icon={InfoIcon}>{t('output.noAgents')}</Note>
      ) : (
        // 宽屏下 Agent Tabs 和权限/MCP Tab 标题固定，下面的 Tab 内容加上提示一起滚动。
        <AgentTabs agents={workspace.agents} agent={agent} className="gap-3" contentClassName="text-base">
          <Tabs value={tab} onValueChange={(value: OutputTab) => setTab(value)} className="gap-3 md:min-h-0 md:flex-1">
            <TabsList variant="line" className="shrink-0">
              <TabsTrigger value="permission">
                <ShieldCheckIcon />
                {t('output.permission')}
              </TabsTrigger>
              <TabsTrigger value="mcp">
                <PlugIcon />
                {t('output.mcp')}
              </TabsTrigger>
            </TabsList>

            <PageScroll>
              <div className="grid gap-6">
                <TabsContent value="permission" className="text-base">
                  {output.permission ? (
                    <PermissionOutputView
                      section={output.permission}
                      lastKey={agent.permission_output?.property_path.split('.').at(-1) ?? ''}
                      workspace={workspace}
                      skippedRules={output.skippedRules}
                    />
                  ) : (
                    <Note icon={InfoIcon}>{t('output.noPermission')}</Note>
                  )}
                </TabsContent>
                <TabsContent value="mcp" className="text-base">
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
                </TabsContent>

                <RuleNoticeList workspace={workspace} notices={output.notices} />
                <PlaceholderNotice notices={output.notices} />
              </div>
            </PageScroll>
          </Tabs>
        </AgentTabs>
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

/** 权限节：作用域、预览、复制说明、跳过的规则。 */
function PermissionOutputView({
  section,
  lastKey,
  workspace,
  skippedRules,
}: {
  section: PermissionSection;
  lastKey: string;
  workspace: Workspace;
  skippedRules: SkippedRule[];
}) {
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
        <CodeView value={section.preview} language="json" label={t('output.preview')} className="text-xs sm:text-sm" />
      </div>

      <p className="text-sm text-muted-foreground text-pretty">{t('output.copyHint', { key: `"${lastKey}"` })}</p>

      <SkippedRuleList workspace={workspace} skippedRules={skippedRules} />
    </div>
  );
}

/** MCP 节：作用域、预览、复制说明、TOML 跳过的字段。“复制”整段覆盖；JSON 风格另有“复制内部”，只复制各 Server 的键值对。TOML 风格附带跳过的字段。 */
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
        <CodeView
          value={section.preview}
          language={section.style}
          label={t('output.preview')}
          className="text-xs sm:text-sm"
        />
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
