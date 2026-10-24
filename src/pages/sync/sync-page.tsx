import { RefreshCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import { Page } from '@/components/page';
import { GistSection } from '@/pages/sync/gist-section';
import { WorkspaceFileSection } from '@/pages/sync/workspace-file-section';

/** 同步页只罗列各节，每一节是独立的组件，放在本目录下。 */
export default function SyncPage() {
  const { t } = useTranslation();

  return (
    <Page icon={RefreshCwIcon} title={t('pages.sync.title')} description={t('pages.sync.description')}>
      <div className="grid gap-10">
        <WorkspaceFileSection />
        <Separator />
        <GistSection />
      </div>
    </Page>
  );
}
