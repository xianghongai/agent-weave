import { PencilIcon, PlusIcon, TagsIcon, Trash2Icon } from 'lucide-react';
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
import type { Tag } from '@/lib/workspace';
import { compareText, countToolsForTag, deleteTag } from '@/lib/workspace-operations';
import { TagDialog } from '@/pages/tags/tag-dialog';
import { useAppStore } from '@/state/app-store';

export default function TagsPage() {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
  const applyOperation = useAppStore((state) => state.applyOperation);
  const tags = workspace.tags.toSorted((a, b) => compareText(a.key, b.key));

  // 对话框关闭时保留目标条目，避免退场动画期间内容跳变。
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tag | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  function openEditor(tag: Tag | null) {
    setEditTarget(tag);
    setEditOpen(true);
  }

  const deleteToolCount = deleteTarget ? countToolsForTag(workspace, deleteTarget.id) : 0;

  return (
    <Page
      icon={TagsIcon}
      title={t('pages.tags.title')}
      description={t('pages.tags.description')}
      actions={
        <Button onClick={() => openEditor(null)}>
          <PlusIcon />
          {t('tags.add')}
        </Button>
      }
    >
      <section className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t('tags.listHint')}</p>

        {tags.length === 0 ? (
          <Note icon={TagsIcon}>{t('tags.empty')}</Note>
        ) : (
          <ul className="divide-y rounded-xl border">
            {tags.map((tag) => {
              const toolCount = countToolsForTag(workspace, tag.id);
              return (
                <li key={tag.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="font-medium">{tag.name}</span>
                    <code className="truncate font-mono text-sm text-muted-foreground">{tag.key}</code>
                  </div>
                  {toolCount > 0 && <Badge variant="secondary">{t('tags.toolCount', { n: toolCount })}</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('tags.editLabel', { key: tag.key })}
                    title={t('common.edit')}
                    onClick={() => openEditor(tag)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('tags.deleteLabel', { key: tag.key })}
                    title={t('common.delete')}
                    onClick={() => {
                      setDeleteTarget(tag);
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
      </section>

      <TagDialog open={editOpen} onOpenChange={setEditOpen} tag={editTarget} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tags.deleteTitle', { key: deleteTarget?.key ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteToolCount > 0 ? t('tags.deleteWithTools', { n: deleteToolCount }) : t('tags.deleteNoTools')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  applyOperation((current) => deleteTag(current, deleteTarget.id));
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
