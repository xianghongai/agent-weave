import { DownloadIcon, FileJsonIcon, ShieldCheckIcon, UploadIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Note } from '@/components/page';
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
import { importProblemMessage } from '@/i18n/problems';
import { downloadText } from '@/browser/download';
import { formatTime } from '@/i18n/format-time';
import type { Workspace } from '@/lib/workspace';
import { exportWorkspace, importWorkspace } from '@/lib/workspace-file';
import { useAppStore } from '@/state/app-store';

/** 待确认的导入：文件已通过校验，等待用户确认替换。 */
interface PendingImport {
  fileName: string;
  workspace: Workspace;
}

/** 同步页的“导入与导出”一节：导出工作区文件，或用文件整体替换当前工作区。 */
export function WorkspaceFileSection() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceWorkspace = useAppStore((state) => state.replaceWorkspace);
  // 对话框关闭时保留待导入的内容，避免退场动画期间内容跳变。
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<PendingImport | null>(null);

  function handleExport() {
    const file = exportWorkspace(useAppStore.getState().workspace);
    downloadText(file.fileName, file.text);
  }

  async function handleFile(file: File) {
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast.error(t('workspaceFile.importFailed', { file: file.name }), {
        description: t('workspaceFile.readFailed'),
      });
      return;
    }
    // 先校验再确认：文件无效时直接说明原因，当前工作区保持不变。
    const result = importWorkspace(text);
    if ('problem' in result) {
      toast.error(t('workspaceFile.importFailed', { file: file.name }), {
        description: importProblemMessage(t, result),
      });
      return;
    }
    setPending({ fileName: file.name, workspace: result.workspace });
    setConfirmOpen(true);
  }

  function confirmImport() {
    if (pending) {
      replaceWorkspace(pending.workspace);
      toast.success(t('workspaceFile.imported'));
    }
    setConfirmOpen(false);
  }

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h2 className="flex items-center gap-2 font-medium">
          <FileJsonIcon className="size-4 text-brand" />
          {t('workspaceFile.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('workspaceFile.hint')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleExport}>
          <DownloadIcon />
          {t('workspaceFile.export')}
        </Button>
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          <UploadIcon />
          {t('workspaceFile.import')}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,.jsonc,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // 清空选择，同一个文件改过之后可以再次选择。
            event.target.value = '';
            if (file) {
              void handleFile(file);
            }
          }}
        />
      </div>

      <Note icon={ShieldCheckIcon}>{t('workspaceFile.exportHint')}</Note>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('workspaceFile.confirmTitle', { file: pending?.fileName ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                t('workspaceFile.summary', {
                  commands: pending.workspace.command_tools.length,
                  servers: pending.workspace.mcp_servers.length,
                  agents: pending.workspace.agents.length,
                  rules: pending.workspace.rules.length,
                  updatedAt: formatTime(pending.workspace.updated_at),
                })}
              {t('workspaceFile.confirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmImport}>
              {t('workspaceFile.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
