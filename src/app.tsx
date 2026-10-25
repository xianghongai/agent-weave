import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router';

import { DeviceSettingsDialog } from '@/components/device-settings-dialog';
import { PresetsDialog } from '@/components/presets-dialog';
import { PwaPrompt } from '@/components/pwa-prompt';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { StorageBanner } from '@/components/storage-banner';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PAGES } from '@/pages/registry';

const HomePage = lazy(() => import('@/pages/home/home-page'));

function PageRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      {/* 宽屏下填满主区域的剩余高度，各页面自己处理溢出。只在切换页面时播放动画，查询串变化不算。 */}
      <motion.div
        key={location.pathname}
        className="flex flex-col md:min-h-0 md:flex-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <Suspense fallback={<div className="min-h-96 md:min-h-0 md:flex-1" />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            {PAGES.map(({ id, path, component: Component }) => (
              <Route key={id} path={path} element={<Component />} />
            ))}
            {/* 未知路径回到首页。 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        {/*
          hash 路由：GitHub Pages 没有服务端重写，路径和查询串都放在 # 之后才能直接打开和刷新。
          不把路由更新包进 transition：工作区 store 基于 useSyncExternalStore，筛选输入框也受查询串控制，都要求同步更新。
        */}
        <HashRouter useTransitions={false}>
          {/* 宽屏一屏布局：外壳固定为视口高度，页眉和页脚固定，主区域填满中间；窄屏保持整页滚动。 */}
          <div className="flex min-h-dvh flex-col md:h-dvh">
            <SiteHeader />
            <main className="page-width flex flex-1 flex-col md:min-h-0">
              <StorageBanner />
              <PageRoutes />
            </main>
            <SiteFooter />
          </div>
        </HashRouter>
        {/* 全局对话框可以从任何页面打开，见 `ui-store` 的 `openDialog`。 */}
        <DeviceSettingsDialog />
        <PresetsDialog />
        <Toaster position="bottom-center" />
        <PwaPrompt />
      </TooltipProvider>
    </MotionConfig>
  );
}
