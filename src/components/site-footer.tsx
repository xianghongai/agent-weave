import { ShieldIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="page-width flex items-start gap-2 py-6 text-sm text-muted-foreground">
      <ShieldIcon className="mt-0.5 size-4 shrink-0" />
      <p className="text-pretty">{t('footer.privacy')}</p>
    </footer>
  );
}
