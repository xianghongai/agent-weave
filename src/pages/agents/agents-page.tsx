import { BotIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Note, Page, PageScroll } from '@/components/page';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Agent } from '@/lib/workspace';
import { countRulesForAgent, deleteAgent, findSelectedAgent } from '@/lib/workspace-operations';
import { AgentDialog } from '@/pages/agents/agent-dialog';
import { AgentSummary } from '@/pages/agents/agent-summary';
import { BuiltInToolsSection } from '@/pages/agents/built-in-tools-section';
import { useAppStore } from '@/state/app-store';
import { useUiStore } from '@/state/ui-store';

export default function AgentsPage() {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const applyOperation = useAppStore((state) => state.applyOperation);
  const selectedId = useUiStore((state) => state.selectedAgentId);
  const selectAgent = useUiStore((state) => state.selectAgent);
  const agent = findSelectedAgent(workspace, selectedId);

  // 对话框关闭时保留目标条目，避免退场动画期间内容跳变。
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Agent | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);

  function openEditor(target: Agent | null) {
    setEditTarget(target);
    setEditOpen(true);
  }

  function confirmDelete(target: Agent) {
    setDeleteTarget(target);
    setDeleteOpen(true);
  }

  /** 新增的 Agent 排在最后，保存后切换到它的 Tab。 */
  function selectAddedAgent() {
    const added = useAppStore.getState().workspace.agents.at(-1);
    if (added) {
      selectAgent(added.id);
    }
  }

  return (
    <Page
      icon={BotIcon}
      title={t('pages.agents.title')}
      description={t('pages.agents.description')}
      scroll="custom"
      actions={
        <Button onClick={() => openEditor(null)}>
          <PlusIcon />
          {t('agents.add')}
        </Button>
      }
    >
      {!agent ? (
        <Note icon={BotIcon}>{t('agents.empty')}</Note>
      ) : (
        // Tab 按录入顺序排列，与输出页一致；选中的 Agent 与输出页共用。
        <Tabs
          value={agent.id}
          onValueChange={(value: string) => selectAgent(value)}
          className="gap-4 md:min-h-0 md:flex-1"
        >
          <TabsList className="max-w-full shrink-0 justify-start overflow-x-auto">
            {workspace.agents.map((candidate) => (
              <TabsTrigger key={candidate.id} value={candidate.id} className="flex-none">
                {candidate.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={agent.id} className="flex flex-col md:min-h-0">
            <PageScroll>
              <div className="grid gap-6">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 text-muted-foreground">{agent.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t('agents.editLabel', { name: agent.name })}
                    onClick={() => openEditor(agent)}
                  >
                    <PencilIcon />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t('agents.deleteLabel', { name: agent.name })}
                    onClick={() => confirmDelete(agent)}
                  >
                    <Trash2Icon />
                    {t('common.delete')}
                  </Button>
                </div>
                <AgentSummary agent={agent} />
                <BuiltInToolsSection agent={agent} />
              </div>
            </PageScroll>
          </TabsContent>
        </Tabs>
      )}

      <AgentDialog open={editOpen} onOpenChange={setEditOpen} agent={editTarget} onAdded={selectAddedAgent} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('agents.deleteTitle', { name: deleteTarget?.name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('agents.deleteDescription', {
                tools: deleteTarget?.built_in_tools.length ?? 0,
                rules: deleteTarget ? countRulesForAgent(workspace, deleteTarget.id) : 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  applyOperation((current) => deleteAgent(current, deleteTarget.id));
                }
                setDeleteOpen(false);
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
