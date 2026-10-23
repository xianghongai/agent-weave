import { BotIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Note, Page } from '@/components/page';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Agent } from '@/lib/workspace';
import { countRulesForAgent, deleteAgent } from '@/lib/workspace-operations';
import { AgentDialog } from '@/pages/agents/agent-dialog';
import { BuiltInToolsSection } from '@/pages/agents/built-in-tools-section';
import { runOperation, useWorkspace } from '@/state/workspace-store';

export default function AgentsPage() {
  const { t } = useTranslation();
  const workspace = useWorkspace();

  // 对话框关闭时保留目标条目，避免退场动画期间内容跳变。
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Agent | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);

  function openEditor(agent: Agent | null) {
    setEditTarget(agent);
    setEditOpen(true);
  }

  function confirmDelete(agent: Agent) {
    setDeleteTarget(agent);
    setDeleteOpen(true);
  }

  return (
    <Page
      icon={BotIcon}
      title={t('pages.agents.title')}
      description={t('pages.agents.description')}
      actions={
        <Button onClick={() => openEditor(null)}>
          <PlusIcon />
          {t('agents.add')}
        </Button>
      }
    >
      {/* Agent 按录入顺序排列，与输出页的标签顺序一致。 */}
      {workspace.agents.length === 0 ? (
        <Note icon={BotIcon}>{t('agents.empty')}</Note>
      ) : (
        <ul className="divide-y rounded-xl border">
          {workspace.agents.map((agent) => (
            <li key={agent.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-medium">{agent.name}</span>
                {agent.description && (
                  <span className="truncate text-sm text-muted-foreground">{agent.description}</span>
                )}
              </div>
              {agent.permission_output ? (
                <code className="hidden truncate font-mono text-xs text-muted-foreground sm:block">
                  {agent.permission_output.property_path}
                </code>
              ) : (
                <Badge variant="outline">{t('agents.noPermissionOutput')}</Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('agents.editLabel', { name: agent.name })}
                title={t('common.edit')}
                onClick={() => openEditor(agent)}
              >
                <PencilIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('agents.deleteLabel', { name: agent.name })}
                title={t('common.delete')}
                onClick={() => confirmDelete(agent)}
              >
                <Trash2Icon />
              </Button>
              {/* 换行到下一行，占满整行。 */}
              <BuiltInToolsSection agent={agent} className="basis-full" />
            </li>
          ))}
        </ul>
      )}

      <AgentDialog open={editOpen} onOpenChange={setEditOpen} agent={editTarget} />

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
                  runOperation((current) => deleteAgent(current, deleteTarget.id));
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
