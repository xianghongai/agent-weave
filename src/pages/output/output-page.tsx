import { cn } from 'cn';
import { FileCodeIcon, FolderOpenIcon, InfoIcon, ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CopyButton } from '@/components/copy-button';
import { DECISION_TONE } from '@/components/decision-tone';
import { Note, Page } from '@/components/page';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type PermissionSection, generate } from '@/lib/generate';
import { EMPTY_DEVICE_SETTINGS, type Scope } from '@/lib/workspace';
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
        </div>
      )}
    </Page>
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
