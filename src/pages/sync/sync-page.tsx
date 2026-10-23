import { RefreshCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Page } from '@/components/page';
import { PresetSection } from '@/pages/sync/preset-section';

/** 同步页：各功能各自是一节独立的组件，这里只负责排列。 */
export default function SyncPage() {
  const { t } = useTranslation();

  return (
    <Page icon={RefreshCwIcon} title={t('pages.sync.title')} description={t('pages.sync.description')}>
      <div className="grid gap-8">
        <PresetSection />
      </div>
    </Page>
  );
}
