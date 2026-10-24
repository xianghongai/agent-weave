import { PencilIcon, PlugIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readTagIdFromHistory } from '@/browser/history-state';
import { Note, Page, PageScroll } from '@/components/page';
import { RuleCountBadge } from '@/components/rule-count-badge';
import { KeyWithTags } from '@/components/tag-badges';
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
import type { McpServer } from '@/lib/workspace';
import {
  type ToolFilter,
  compareText,
  countRulesForTool,
  deleteMcpServer,
  matchesToolFilter,
  toolFilterForTag,
} from '@/lib/workspace-operations';
import { McpServerDialog } from '@/pages/mcp/mcp-server-dialog';
import { useAppStore } from '@/state/app-store';

export default function McpPage() {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const applyOperation = useAppStore((state) => state.applyOperation);
  // 从标签页跳转过来时，history.state 带着要筛选的标签。
  const [filter, setFilter] = useState<ToolFilter>(() => toolFilterForTag(workspace, readTagIdFromHistory()));
  // 与输出中的顺序一致，按标识排序。
  const allServers = workspace.mcp_servers.toSorted((a, b) => compareText(a.key, b.key));
  const servers = allServers.filter((server) => matchesToolFilter(server, filter));

  // 对话框关闭时保留目标条目，避免退场动画期间内容跳变。
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<McpServer | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<McpServer | null>(null);

  function openEditor(server: McpServer | null) {
    setEditTarget(server);
    setEditOpen(true);
  }

  function confirmDelete(server: McpServer) {
    setDeleteTarget(server);
    setDeleteOpen(true);
  }

  const deleteRuleCount = deleteTarget ? countRulesForTool(workspace, { type: 'mcp', id: deleteTarget.id }) : 0;

  return (
    <Page
      icon={PlugIcon}
      title={t('pages.mcp.title')}
      description={t('pages.mcp.description')}
      scroll="custom"
      actions={
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
          <ToolFilterBar workspace={workspace} value={filter} onChange={setFilter} />
          <Button className="ml-auto" onClick={() => openEditor(null)}>
            <PlusIcon />
            {t('mcp.add')}
          </Button>
        </div>
      }
    >
      {/* 标题和筛选栏固定，只有列表滚动。 */}
      <section className="flex flex-col gap-3 md:min-h-0 md:flex-1">
        {allServers.length === 0 ? (
          <Note icon={PlugIcon}>{t('mcp.empty')}</Note>
        ) : servers.length === 0 ? (
          <Note icon={PlugIcon}>{t('filters.noMatch')}</Note>
        ) : (
          <PageScroll framed>
            <ul className="divide-y">
              {servers.map((server) => (
                <li key={server.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <KeyWithTags toolKey={server.key} tagIds={server.tag_ids} />
                    {server.description && (
                      <span className="truncate text-sm text-muted-foreground">{server.description}</span>
                    )}
                    <code className="truncate font-mono text-xs text-muted-foreground">
                      {JSON.stringify(server.content)}
                    </code>
                  </div>
                  {server.high_risk && <HighRiskBadge />}
                  <RuleCountBadge tool={{ type: 'mcp', id: server.id }} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('mcp.editLabel', { key: server.key })}
                    title={t('common.edit')}
                    onClick={() => openEditor(server)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('mcp.deleteLabel', { key: server.key })}
                    title={t('common.delete')}
                    onClick={() => confirmDelete(server)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          </PageScroll>
        )}
      </section>

      <McpServerDialog open={editOpen} onOpenChange={setEditOpen} server={editTarget} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('mcp.deleteTitle', { key: deleteTarget?.key ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRuleCount > 0 ? t('mcp.deleteWithRules', { n: deleteRuleCount }) : t('mcp.deleteNoRules')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  applyOperation((current) => deleteMcpServer(current, deleteTarget.id));
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
