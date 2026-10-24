import { cn } from 'cn';
import { LaptopIcon, PackageIcon, SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PAGES } from '@/pages/registry';
import { useUiStore } from '@/state/ui-store';

/** 入口放在设置菜单中的页面，如不常维护的标签页。 */
const SETTINGS_PAGES = PAGES.filter((page) => page.entry === 'settings');

/**
 * 页眉的设置菜单：打开挂在应用外壳上的本机设置和预设对话框，以及入口放在这里的页面。
 * 当前处于这些页面时，菜单按钮显示为选中状态，与导航入口一致。
 */
export function SettingsMenu() {
  const { t } = useTranslation();
  const showDialog = useUiStore((state) => state.showDialog);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const label = t('header.settings');
  const onSettingsPage = SETTINGS_PAGES.some((page) => page.path === pathname);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={label}
                  className={cn(onSettingsPage && 'bg-muted text-brand')}
                />
              }
            />
          }
        >
          <SettingsIcon />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuItem onClick={() => showDialog('deviceSettings')}>
          <LaptopIcon />
          {t('header.deviceSettings')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => showDialog('presets')}>
          <PackageIcon />
          {t('header.presets')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {SETTINGS_PAGES.map(({ id, path, icon: Icon }) => (
          <DropdownMenuItem key={id} onClick={() => navigate(path)}>
            <Icon />
            {t(`pages.${id}.title`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
