import { PencilIcon, PlusIcon, TerminalIcon, Trash2Icon, WrenchIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Note, Page, PageScroll } from '@/components/page';
import { RuleCountBadge } from '@/components/rule-count-badge';
import { ToolSummary } from '@/components/tag-badges';
import { ToolFilterBar } from '@/components/tool-filter-bar';
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
import { HighRiskBadge } from '@/components/high-risk';
import { Button } from '@/components/ui/button';
import { useFilterQuery } from '@/hooks/use-filter-query';
import type { CommandTool } from '@/lib/workspace';
import { toolFilterFromQuery, toolFilterToQuery } from '@/lib/filter-query';
import { compareText, countRulesForTool, deleteCommandTool, matchesToolFilter } from '@/lib/workspace-operations';
import { CommandToolDialog } from '@/pages/tools/command-tool-dialog';
import { useAppStore } from '@/state/app-store';

export default function ToolsPage() {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const applyOperation = useAppStore((state) => state.applyOperation);
  const [filter, setFilter] = useFilterQuery(toolFilterFromQuery, toolFilterToQuery);
  const allTools = workspace.command_tools.toSorted((a, b) => compareText(a.key, b.key));
  const tools = allTools.filter((tool) => matchesToolFilter(tool, filter));

  // 对话框关闭时保留目标条目，避免退场动画期间内容跳变。
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CommandTool | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommandTool | null>(null);

  function openEditor(tool: CommandTool | null) {
    setEditTarget(tool);
    setEditOpen(true);
  }

  function confirmDelete(tool: CommandTool) {
    setDeleteTarget(tool);
    setDeleteOpen(true);
  }

  const deleteRuleCount = deleteTarget ? countRulesForTool(workspace, { type: 'command', id: deleteTarget.id }) : 0;

  return (
    <Page
      icon={WrenchIcon}
      title={t('pages.tools.title')}
      description={t('pages.tools.description')}
      scroll="custom"
      actions={
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
          <ToolFilterBar workspace={workspace} value={filter} onChange={setFilter} />

          <Button className="ml-auto" onClick={() => openEditor(null)}>
            <PlusIcon />
            {t('tools.add')}
          </Button>
        </div>
      }
    >
      {/* 标题和筛选栏固定，只有列表滚动。 */}
      <section className="flex flex-col gap-3 md:min-h-0 md:flex-1">
        {allTools.length === 0 ? (
          <Note icon={TerminalIcon}>{t('tools.empty')}</Note>
        ) : tools.length === 0 ? (
          <Note icon={TerminalIcon}>{t('filters.noMatch')}</Note>
        ) : (
          <PageScroll framed>
            <ul className="divide-y">
              {tools.map((tool) => (
                <li key={tool.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <ToolSummary toolKey={tool.key} description={tool.description} tagIds={tool.tag_ids} />
                  </div>
                  {tool.high_risk && <HighRiskBadge />}
                  <RuleCountBadge tool={{ type: 'command', id: tool.id }} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('tools.editLabel', { key: tool.key })}
                    title={t('common.edit')}
                    onClick={() => openEditor(tool)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('tools.deleteLabel', { key: tool.key })}
                    title={t('common.delete')}
                    onClick={() => confirmDelete(tool)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          </PageScroll>
        )}
      </section>

      <CommandToolDialog open={editOpen} onOpenChange={setEditOpen} tool={editTarget} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tools.deleteTitle', { key: deleteTarget?.key ?? '' })}</AlertDialogTitle>
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
                  applyOperation((current) => deleteCommandTool(current, deleteTarget.id));
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
