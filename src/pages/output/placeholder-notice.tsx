import { TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { Note } from '@/components/page';
import type { Notice } from '@/lib/notices';

/**
 * “占位符未展开”的提示：本机设置不完整时，汇总受影响的规则和 MCP Server 数量，并引导到同步页填写。
 * 没有这类提示时不显示。
 */
export function PlaceholderNotice({ notices }: { notices: Notice[] }) {
  const { t } = useTranslation();
  const unexpanded = notices.filter((notice) => notice.type === 'placeholderUnexpanded');
  if (unexpanded.length === 0) {
    return null;
  }

  return (
    <Note tone="warning" icon={TriangleAlertIcon}>
      <p className="font-medium">{t('output.placeholderUnexpanded')}</p>
      <p>
        {t('output.placeholderUnexpandedHint', {
          rules: unexpanded.filter((notice) => notice.ruleId !== null).length,
          servers: unexpanded.filter((notice) => notice.serverId !== null).length,
          home: '{{home}}',
          user: '{{user}}',
        })}
      </p>
      <p>
        <Link href="/sync" className="font-medium text-brand underline-offset-4 hover:underline">
          {t('output.openDeviceSettings')}
        </Link>
      </p>
    </Note>
  );
}
