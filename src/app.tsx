import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Suspense } from 'react';
import { Redirect, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';

import { DeviceSettingsDialog } from '@/components/device-settings-dialog';
import { PresetsDialog } from '@/components/presets-dialog';
import { PwaPrompt } from '@/components/pwa-prompt';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { StorageBanner } from '@/components/storage-banner';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import HomePage from '@/pages/home/home-page';
import { PAGES } from '@/pages/registry';

function Routes() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      {/* 宽屏下填满主区域的剩余高度，各页面自己处理溢出。 */}
      <motion.div
        key={location}
        className="flex flex-col md:min-h-0 md:flex-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <Suspense fallback={<div className="min-h-96 md:min-h-0 md:flex-1" />}>
          <Switch location={location}>
            <Route path="/" component={HomePage} />
            {PAGES.map(({ id, path, component }) => (
              <Route key={id} path={path} component={component} />
            ))}
            {/* 未知路径回到首页。 */}
            <Route>
              <Redirect to="/" replace />
            </Route>
          </Switch>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        {/* hash 路由：GitHub Pages 没有服务端重写，路径放在 # 之后才能直接打开和刷新。 */}
        <Router hook={useHashLocation}>
          {/* 宽屏一屏布局：外壳固定为视口高度，页眉和页脚固定，主区域填满中间；窄屏保持整页滚动。 */}
          <div className="flex min-h-dvh flex-col md:h-dvh">
            <SiteHeader />
            <main className="page-width flex flex-1 flex-col md:min-h-0">
              <StorageBanner />
              <Routes />
            </main>
            <SiteFooter />
          </div>
        </Router>
        {/* 全局对话框可以从任何页面打开，见 `ui-store` 的 `openDialog`。 */}
        <DeviceSettingsDialog />
        <PresetsDialog />
        <Toaster position="bottom-center" />
        <PwaPrompt />
      </TooltipProvider>
    </MotionConfig>
  );
}
