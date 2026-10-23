import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Suspense } from 'react';
import { Redirect, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';

import { PwaPrompt } from '@/components/pwa-prompt';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { StorageBanner } from '@/components/storage-banner';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PAGES } from '@/pages/registry';

/** 首页即导航中的第一页。 */
const HOME_PATH = PAGES[0]?.path ?? '/';

function Routes() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <Suspense fallback={<div className="min-h-96" />}>
          <Switch location={location}>
            {PAGES.map(({ id, path, component }) => (
              <Route key={id} path={path} component={component} />
            ))}
            {/* 根路径和未知路径都回到首页。 */}
            <Route>
              <Redirect to={HOME_PATH} replace />
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
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="page-width flex-1">
              <StorageBanner />
              <Routes />
            </main>
            <SiteFooter />
          </div>
        </Router>
        <Toaster position="bottom-center" />
        <PwaPrompt />
      </TooltipProvider>
    </MotionConfig>
  );
}
