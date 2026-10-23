import { useTranslation } from 'react-i18next';

import logoUrl from '@/assets/logo.svg';

export function Brand() {
  const { t } = useTranslation();

  return (
    <span className="flex items-center gap-2.5">
      <img src={logoUrl} alt="" className="size-7" />
      {/* 窄屏只显示标志，把横向空间留给导航。 */}
      <span className="hidden text-lg font-semibold tracking-tight sm:inline">{t('brand.name')}</span>
    </span>
  );
}
