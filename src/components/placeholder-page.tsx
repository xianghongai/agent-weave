import { ConstructionIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Note, Page } from '@/components/page';
import { PAGES, type PageEntry } from '@/pages/registry';

/** 尚未实现的页面：显示标题、说明和“建设中”提示。实现某一页时替换掉它。 */
export function PlaceholderPage({ id }: { id: PageEntry['id'] }) {
  const { t } = useTranslation();
  const entry = PAGES.find((page) => page.id === id);

  return (
    <Page
      icon={entry?.icon ?? ConstructionIcon}
      title={t(`pages.${id}.title`)}
      description={t(`pages.${id}.description`)}
    >
      <Note icon={ConstructionIcon}>{t('placeholder.comingSoon')}</Note>
    </Page>
  );
}
