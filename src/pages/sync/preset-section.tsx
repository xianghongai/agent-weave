import { CopyPlusIcon, PackageIcon, RotateCcwIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
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
import { type MergeSkip, mergePresets, resetToPresets } from '@/lib/preset-operations';
import { getWorkspace, runOperation } from '@/state/workspace-store';

/** 同步页中的“预设”一节：合并预设与重置为预设。 */
export function PresetSection() {
  const { t } = useTranslation();
  const [skipped, setSkipped] = useState<MergeSkip[]>([]);
  const [resetOpen, setResetOpen] = useState(false);

  function merge() {
    // 合并是同步执行的，先算出结果再交给 store，才能拿到报告。
    const { workspace, report } = mergePresets(getWorkspace());
    if (report.added > 0) {
      runOperation(() => ({ workspace }));
    }
    toast.success(report.added > 0 ? t('presets.mergedSome', { n: report.added }) : t('presets.mergedNone'));
    setSkipped(report.skipped);
  }

  function reset() {
    runOperation((current) => resetToPresets(current));
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
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h2 className="flex items-center gap-2 font-medium">
          <PackageIcon className="size-4 text-brand" />
          {t('presets.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('presets.hint')}</p>
      </div>

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
          <p className="font-medium">{t('presets.skippedTitle', { n: skipped.length })}</p>
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
    </section>
  );
}
