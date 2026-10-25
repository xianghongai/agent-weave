import { cn } from 'cn';
import { CopyPlusIcon, RotateCcwIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { DIALOG_SIZE_CLASS } from '@/components/form-dialog';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { currentLanguage } from '@/i18n';
import { type MergeSkip, mergePresets, resetToPresets } from '@/lib/preset-operations';
import { useAppStore } from '@/state/app-store';
import { useUiStore } from '@/state/ui-store';

/**
 * 预设对话框：合并预设与重置为预设，挂在应用外壳上，由 `ui-store` 的 `openDialog` 控制开关。
 * 没有输入框，不是表单对话框：点空白处或按 Esc 都可以关闭；宽度与窄的表单对话框一致。
 */
export function PresetsDialog() {
  const { t } = useTranslation();
  const open = useUiStore((state) => state.openDialog === 'presets');
  const closeDialog = useUiStore((state) => state.closeDialog);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          closeDialog();
        }
      }}
    >
      <DialogContent
        className={cn('flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto', DIALOG_SIZE_CLASS.narrow)}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{t('presets.title')}</DialogTitle>
          <DialogDescription>{t('presets.hint')}</DialogDescription>
        </DialogHeader>
        {/* 对话框关闭后连同内容一起卸载，再次打开时不再显示上一次的跳过报告。 */}
        <PresetActions />
      </DialogContent>
    </Dialog>
  );
}

function PresetActions() {
  const { t } = useTranslation();
  const replaceWorkspace = useAppStore((state) => state.replaceWorkspace);
  const [skipped, setSkipped] = useState<MergeSkip[]>([]);
  const [resetOpen, setResetOpen] = useState(false);

  function merge() {
    // 合并是同步执行的，先算出结果再交给 store，才能拿到报告。
    const { workspace, report } = mergePresets(useAppStore.getState().workspace, currentLanguage());
    if (report.added > 0) {
      replaceWorkspace(workspace);
    }
    toast.success(report.added > 0 ? t('presets.mergedSome', { count: report.added }) : t('presets.mergedNone'));
    setSkipped(report.skipped);
  }

  function reset() {
    replaceWorkspace(resetToPresets(currentLanguage()).workspace);
    setSkipped([]);
    setResetOpen(false);
    toast.success(t('presets.resetDone'));
  }

  function describe(skip: MergeSkip): string {
    switch (skip.kind) {
      case 'built_in_tool':
        return t('presets.skipped.built_in_tool', { key: skip.key, agent: skip.agentName });
      case 'rule':
        return t('presets.skipped.rule', {
          tool: skip.tool.key,
          pattern: skip.pattern || t('rules.wholeTool'),
        });
      default:
        return t(`presets.skipped.${skip.kind}`, { key: skip.key });
    }
  }

  return (
    <div className="grid gap-3">
      <ul className="divide-y rounded-xl border">
        <li className="flex flex-wrap items-center gap-3 px-3 py-2.5">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">{t('presets.mergeHint')}</p>
          <Button variant="outline" onClick={merge}>
            <CopyPlusIcon />
            {t('presets.merge')}
          </Button>
        </li>
        <li className="flex flex-wrap items-center gap-3 px-3 py-2.5">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">{t('presets.resetHint')}</p>
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            <RotateCcwIcon />
            {t('presets.reset')}
          </Button>
        </li>
      </ul>

      {skipped.length > 0 && (
        <Note tone="warning" icon={TriangleAlertIcon}>
          <p className="font-medium">{t('presets.skippedTitle', { count: skipped.length })}</p>
          <p>{t('presets.skippedHint')}</p>
          <ul className="list-disc pl-5">
            {skipped.map((skip) => (
              <li key={`${skip.kind}:${skip.id}`}>{describe(skip)}</li>
            ))}
          </ul>
          <div>
            <Button variant="outline" size="sm" onClick={() => setSkipped([])}>
              {t('presets.dismissReport')}
            </Button>
          </div>
        </Note>
      )}

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('presets.resetTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('presets.resetDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={reset}>
              {t('presets.resetConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
