import { PencilIcon, PlugIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Note, Page } from '@/components/page';
import { TagBadges } from '@/components/tag-badges';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { McpServer } from '@/lib/workspace';
import {
  NO_TOOL_FILTER,
  type ToolFilter,
  compareText,
  countRulesForTool,
  deleteMcpServer,
  matchesToolFilter,
} from '@/lib/workspace-operations';
import { McpServerDialog } from '@/pages/mcp/mcp-server-dialog';
import { runOperation, useWorkspace } from '@/state/workspace-store';

export default function McpPage() {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  // 与输出中的顺序一致，按标识排序。
  const [filter, setFilter] = useState<ToolFilter>(NO_TOOL_FILTER);
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
      actions={
        <Button onClick={() => openEditor(null)}>
          <PlusIcon />
          {t('mcp.add')}
        </Button>
      }
    >
      <section className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-prose text-sm text-muted-foreground">{t('mcp.serversHint')}</p>
          <ToolFilterBar workspace={workspace} value={filter} onChange={setFilter} />
        </div>

        {allServers.length === 0 ? (
          <Note icon={PlugIcon}>{t('mcp.empty')}</Note>
        ) : servers.length === 0 ? (
          <Note icon={PlugIcon}>{t('filters.noMatch')}</Note>
        ) : (
          <ul className="divide-y rounded-xl border">
            {servers.map((server) => {
              const ruleCount = countRulesForTool(workspace, { type: 'mcp', id: server.id });
              return (
                <li key={server.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <code className="truncate font-mono text-sm font-medium">{server.key}</code>
                    {server.description && (
                      <span className="truncate text-sm text-muted-foreground">{server.description}</span>
                    )}
                    <code className="truncate font-mono text-xs text-muted-foreground">
                      {JSON.stringify(server.content)}
                    </code>
                    <TagBadges tagIds={server.tag_ids} />
                  </div>
                  {server.high_risk && <HighRiskBadge />}
                  {ruleCount > 0 && <Badge variant="secondary">{t('mcp.ruleCount', { n: ruleCount })}</Badge>}
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
              );
            })}
          </ul>
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
                  runOperation((current) => deleteMcpServer(current, deleteTarget.id));
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
