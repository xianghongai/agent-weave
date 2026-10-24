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
  // 本机设置和 Gist 设置的回退提示显示在同步页各自的一节中，这里只提示工作区。
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
          <p className="font-medium">{t('storage.unsavedTitle')}</p>
          <p>
            {persistenceProblemMessage(t, unsaved)}
            {t('storage.unsavedHint')}
          </p>
        </Note>
      )}
      {fallback && (
        <Note tone="warning" icon={HardDriveIcon}>
          <p className="font-medium">{t('storage.fallbackTitle')}</p>
          <p>
            {persistenceProblemMessage(t, fallback)}
            {t('storage.fallbackHint')}
          </p>
          <div>
            <Button variant="outline" size="sm" onClick={() => dismissFallback('workspace')}>
              {t('storage.dismiss')}
            </Button>
          </div>
        </Note>
      )}
    </div>
  );
}
