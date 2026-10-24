import { cn } from 'cn';
import { FileCodeIcon, FolderOpenIcon, InfoIcon, PlugIcon, ShieldCheckIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AgentTabs } from '@/components/agent-tabs';
import { type CodeLanguage } from '@/components/code-theme';
import { CodeView } from '@/components/code-view';
import { CopyButton } from '@/components/copy-button';
import { DECISION_TONE } from '@/components/decision-tone';
import { Note, Page, PageScroll } from '@/components/page';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type McpSection, type PermissionSection, generate } from '@/lib/generate';
import type { Scope } from '@/lib/workspace';
import { findSelectedAgent } from '@/lib/workspace-operations';
import { NoticesPanel } from '@/pages/output/notices-panel';
import { useAppStore } from '@/state/app-store';
import { useUiStore } from '@/state/ui-store';

/** 内层 Tab：权限输出、MCP 输出或重要提示。 */
type OutputTab = 'permission' | 'mcp' | 'notices';

/** 权限和 MCP 两个 Tab 的内容：宽屏下填满剩余高度，只让预览在框内滚动；窄屏下随整页滚动。 */
const OUTPUT_TAB_CONTENT = 'flex flex-col gap-3 pb-3 text-base md:min-h-0';

export default function OutputPage() {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const device = useAppStore((state) => state.deviceSettings);
  const selectedId = useUiStore((state) => state.selectedAgentId);
  // 页面局部状态：切换 Agent 时保持不变，离开页面后重置。
  const [tab, setTab] = useState<OutputTab>('permission');

  const agent = findSelectedAgent(workspace, selectedId);
  const output = agent ? generate(workspace, agent.id, device) : null;
  const hasHighRisk = output?.notices.some((notice) => notice.type === 'highRisk') ?? false;

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
        // 宽屏下 Agent Tabs 和内层 Tab 标题固定，权限和 MCP 的预览在框内滚动，重要提示整体滚动。
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
              <TabsTrigger value="notices">
                <TriangleAlertIcon />
                {t('output.notices')}
                {hasHighRisk && (
                  <>
                    <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
                    <span className="sr-only">{t('output.hasHighRisk')}</span>
                  </>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="permission" className={OUTPUT_TAB_CONTENT}>
              {output.permission ? (
                <PermissionOutputView section={output.permission} />
              ) : (
                <Note icon={InfoIcon}>{t('output.noPermission')}</Note>
              )}
            </TabsContent>
            <TabsContent value="mcp" className={OUTPUT_TAB_CONTENT}>
              {output.mcp ? (
                <McpOutputView section={output.mcp} lastKey={agent.mcp_output?.property_path.split('.').at(-1) ?? ''} />
              ) : (
                <Note icon={InfoIcon}>{t('output.noMcp')}</Note>
              )}
            </TabsContent>
            <TabsContent value="notices" className="flex flex-col text-base md:min-h-0">
              <PageScroll>
                <NoticesPanel workspace={workspace} notices={output.notices} skippedRules={output.skippedRules} />
              </PageScroll>
            </TabsContent>
          </Tabs>
        </AgentTabs>
      )}
    </Page>
  );
}

/** 权限节：作用域、预览、复制说明。 */
function PermissionOutputView({ section }: { section: PermissionSection }) {
  const { t } = useTranslation();

  return (
    <>
      <ScopeList scopes={section.scopes} />
      <Preview
        value={section.preview}
        language="json"
        actions={
          <>
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
          </>
        }
      />
    </>
  );
}

/** MCP 节：作用域、预览、复制说明。“复制”整段覆盖；JSON 风格另有“复制内部”，只复制各 Server 的键值对。 */
function McpOutputView({ section, lastKey }: { section: McpSection; lastKey: string }) {
  const { t } = useTranslation();

  return (
    <>
      <ScopeList scopes={section.scopes} />
      <Preview
        value={section.preview}
        language={section.style}
        actions={
          <>
            {section.copyInnerText !== null && (
              <CopyButton
                text={section.copyInnerText}
                disabled={section.copyInnerText === ''}
                label={t('copy.copyInner')}
              />
            )}
            <CopyButton text={section.copyText} label={t('copy.copy')} variant="default" />
          </>
        }
      />
      <p className="shrink-0 text-sm text-pretty text-muted-foreground">
        {section.style === 'json' ? t('output.mcpCopyHint', { key: `"${lastKey}"` }) : t('output.mcpTomlCopyHint')}
      </p>
    </>
  );
}

/**
 * 预览框：标题栏放复制按钮，下面是只读代码视图。
 * 宽屏下框填满剩余高度，代码在框内滚动，标题栏固定；窄屏下框随内容展开，随整页滚动。
 */
function Preview({ value, language, actions }: { value: string; language: CodeLanguage; actions: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border md:min-h-0 md:flex-1">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/50 px-3 py-2">
        <span className="mr-auto text-sm font-medium">{t('output.preview')}</span>
        {actions}
      </div>
      <ScrollArea className="max-md:[&>[data-slot=scroll-area-viewport]]:overflow-visible! md:min-h-0 md:flex-1">
        <CodeView value={value} language={language} label={t('output.preview')} className="text-xs sm:text-sm" />
      </ScrollArea>
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
    <div className="grid shrink-0 gap-2 rounded-xl bg-muted p-3 text-sm">
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
