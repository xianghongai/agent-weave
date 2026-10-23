import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_TOAST = 'pwa-update';

/**
 * 注册 Service Worker，有新版本时先询问再切换。
 * 切换会刷新页面，所以由用户选择时机，不打断正在进行的编辑。
 */
function PwaPromptInner() {
  const { t } = useTranslation();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) {
      toast.success(t('pwa.offlineReady'));
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady, t]);

  useEffect(() => {
    if (!needRefresh) {
      toast.dismiss(UPDATE_TOAST);
      return;
    }
    toast.info(t('pwa.update'), {
      id: UPDATE_TOAST,
      duration: Infinity,
      description: t('pwa.updateDescription'),
      action: { label: t('pwa.reload'), onClick: () => void updateServiceWorker(true) },
      cancel: { label: t('pwa.later'), onClick: () => setNeedRefresh(false) },
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker, t]);

  return null;
}

/**
 * Service Worker 需要安全上下文（HTTPS 或 localhost），局域网的纯 HTTP 地址下站点照常运行，只是不能离线。
 * 开发服务器也没有 Service Worker。
 */
export function PwaPrompt() {
  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) {
    return null;
  }
  return <PwaPromptInner />;
}
