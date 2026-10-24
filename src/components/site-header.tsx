import { cn } from 'cn';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';

import { Brand } from '@/components/brand';
import { SettingsMenu } from '@/components/settings-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { PAGES } from '@/pages/registry';

const NAV_PAGES = PAGES.filter((page) => page.entry === 'nav');

export function SiteHeader() {
  const { t } = useTranslation();
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="page-width flex h-14 items-center gap-2 sm:gap-4">
        <Link href="/" aria-label={t('header.home')} className="shrink-0 rounded-md">
          <Brand />
        </Link>
        {/* 导航入口在窄屏下只显示图标，仍放不下时横向滚动，不挤压设置菜单和主题切换。 */}
        <nav aria-label={t('header.pages')} className="ml-auto flex min-w-0 items-center gap-0.5 overflow-x-auto">
          {NAV_PAGES.map(({ id, path, icon: Icon }) => {
            const active = location === path;
            const title = t(`pages.${id}.title`);
            return (
              <Link
                key={id}
                href={path}
                title={title}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:px-2.5',
                  active && 'bg-muted text-foreground'
                )}
              >
                <Icon className={cn('size-4', active && 'text-brand')} />
                <span className="sr-only lg:not-sr-only">{title}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <SettingsMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
