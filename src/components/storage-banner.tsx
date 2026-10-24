import { HardDriveIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { Note } from '@/components/page';
import { Button } from '@/components/ui/button';
import { persistenceProblemMessage } from '@/i18n/problems';
import { useUiStore } from '@/state/ui-store';

/**
 * 本地存储的提示，显示在所有页面顶部。
 * 修改无法保存时持续显示警告，直到写入恢复成功；启动时回退到预设的提示可以由用户关闭。
 */
export function StorageBanner() {
  const { t } = useTranslation();
  // 本机设置的回退提示显示在本机设置对话框中，Gist 设置的显示在同步页，这里只提示工作区。
  const { fallback, unsaved, dismissFallback } = useUiStore(
    useShallow((state) => ({
      fallback: state.fallback?.workspace ?? null,
      unsaved: state.unsaved,
      dismissFallback: state.dismissFallback,
    }))
  );

  if (!fallback && !unsaved) {
    return null;
  }

  return (
    <div className="grid gap-2 pt-6" role="status">
      {unsaved && (
        <Note tone="warning" icon={TriangleAlertIcon}>
          <p>
            <span className="mr-1 font-medium">{t('storage.unsavedTitle')}</span>{' '}
            {persistenceProblemMessage(t, unsaved)}
            {t('storage.unsavedHint')}
          </p>
        </Note>
      )}
      {fallback && (
        <Note tone="warning" icon={HardDriveIcon}>
          {/* 标题、说明和按钮排成一行，按钮靠右；放不下时按钮换到下一行。 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="min-w-0 flex-1 basis-64">
              <span className="mr-1 font-medium">{t('storage.fallbackTitle')}</span>{' '}
              {persistenceProblemMessage(t, fallback)}
              {t('storage.fallbackHint')}
            </p>
            {/* 负外边距抵掉按钮多出的高度，单行时提示框与只有文字时一样高。 */}
            <Button variant="outline" size="sm" className="-my-1 ml-auto" onClick={() => dismissFallback('workspace')}>
              {t('storage.dismiss')}
            </Button>
          </div>
        </Note>
      )}
    </div>
  );
}
