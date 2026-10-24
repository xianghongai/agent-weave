import { LaptopIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import type { Notice } from '@/lib/notices';
import { NoticeSection } from '@/pages/output/notice-section';
import { useUiStore } from '@/state/ui-store';

/**
 * “占位符未展开”的提示：本机设置不完整时，汇总受影响的规则和 MCP Server 数量，并可以直接打开本机设置对话框填写。
 * 没有这类提示时不显示。
 */
export function PlaceholderNotice({ notices }: { notices: Notice[] }) {
  const { t } = useTranslation();
  const showDialog = useUiStore((state) => state.showDialog);
  const unexpanded = notices.filter((notice) => notice.type === 'placeholderUnexpanded');
  if (unexpanded.length === 0) {
    return null;
  }

  return (
    <NoticeSection
      icon={TriangleAlertIcon}
      title={t('output.placeholderUnexpanded')}
      hint={t('output.placeholderUnexpandedHint', {
        rules: unexpanded.filter((notice) => notice.ruleId !== null).length,
        servers: unexpanded.filter((notice) => notice.serverId !== null).length,
        home: '{{home}}',
        user: '{{user}}',
      })}
    >
      <div>
        <Button variant="outline" size="sm" onClick={() => showDialog('deviceSettings')}>
          <LaptopIcon />
          {t('output.openDeviceSettings')}
        </Button>
      </div>
    </NoticeSection>
  );
}
