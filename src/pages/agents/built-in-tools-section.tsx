import { cn } from 'cn';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import type { Agent, BuiltInTool } from '@/lib/workspace';
import { compareText, countRulesForTool, deleteBuiltInTool } from '@/lib/workspace-operations';
import { BuiltInToolDialog } from '@/pages/agents/built-in-tool-dialog';
import { runOperation, useWorkspace } from '@/state/workspace-store';

/** 某个 Agent 的内置工具清单：按标识排序，可以增删改；删除时确认受影响的规则数量。 */
export function BuiltInToolsSection({ agent, className }: { agent: Agent; className?: string }) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const tools = agent.built_in_tools.toSorted((a, b) => compareText(a.key, b.key));

  // 对话框关闭时保留目标条目，避免退场动画期间内容跳变。
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BuiltInTool | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BuiltInTool | null>(null);

  function openEditor(tool: BuiltInTool | null) {
    setEditTarget(tool);
    setEditOpen(true);
  }

  const deleteRuleCount = deleteTarget ? countRulesForTool(workspace, { type: 'built_in', id: deleteTarget.id }) : 0;

  return (
    <section className={cn('grid gap-2', className)} aria-label={t('builtInTools.sectionLabel', { agent: agent.name })}>
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-xs font-medium text-muted-foreground">{t('builtInTools.title')}</h3>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('builtInTools.addLabel', { agent: agent.name })}
          onClick={() => openEditor(null)}
        >
          <PlusIcon />
          {t('builtInTools.add')}
        </Button>
      </div>

      {tools.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('builtInTools.empty')}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {tools.map((tool) => {
            const ruleCount = countRulesForTool(workspace, { type: 'built_in', id: tool.id });
            return (
              <li key={tool.id} className="flex items-center gap-3 px-3 py-1.5">
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <code className="truncate font-mono text-sm font-medium">{tool.key}</code>
                  {tool.description && (
                    <span className="truncate text-xs text-muted-foreground">{tool.description}</span>
                  )}
                </div>
                {tool.writes && <Badge variant="outline">{t('builtInTools.writesBadge')}</Badge>}
                {ruleCount > 0 && <Badge variant="secondary">{t('tools.ruleCount', { n: ruleCount })}</Badge>}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('tools.editLabel', { key: tool.key })}
                  title={t('common.edit')}
                  onClick={() => openEditor(tool)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('tools.deleteLabel', { key: tool.key })}
                  title={t('common.delete')}
                  onClick={() => {
                    setDeleteTarget(tool);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2Icon />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <BuiltInToolDialog open={editOpen} onOpenChange={setEditOpen} agent={agent} tool={editTarget} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('builtInTools.deleteTitle', { agent: agent.name, key: deleteTarget?.key ?? '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRuleCount > 0 ? t('tools.deleteWithRules', { n: deleteRuleCount }) : t('tools.deleteNoRules')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  runOperation((current) => deleteBuiltInTool(current, deleteTarget.id));
                }
                setDeleteOpen(false);
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
