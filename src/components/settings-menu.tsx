import { LaptopIcon, PackageIcon, SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUiStore } from '@/state/ui-store';

/** 页眉的设置菜单：打开挂在应用外壳上的本机设置和预设对话框。 */
export function SettingsMenu() {
  const { t } = useTranslation();
  const showDialog = useUiStore((state) => state.showDialog);
  const label = t('header.settings');

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={label} />} />}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
