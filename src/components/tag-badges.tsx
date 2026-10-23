import { TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { resolveTags } from '@/lib/workspace-operations';
import { useWorkspace } from '@/state/workspace-store';

/** 已删除标签的配色：与“询问”决策同为琥珀色，提示需要清理。 */
export const DANGLING_TAG_TONE = 'border-amber-600/40 text-amber-700 dark:border-amber-400/40 dark:text-amber-400';

/**
 * 工具上的标签，按工具上的顺序显示名称。
 * 已被删除的标签只剩内部 ID，显示为带警告符号的“已删除的标签”；内部 ID 不在界面上显示。
 */
export function TagBadges({ tagIds }: { tagIds: readonly string[] }) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  if (tagIds.length === 0) {
    return null;
  }

  return (
    <span className="flex flex-wrap gap-1">
      {resolveTags(workspace, tagIds).map(({ id, tag }) =>
        tag ? (
          <Badge key={id} variant="outline" title={tag.key}>
            {tag.name}
          </Badge>
        ) : (
          <Badge key={id} variant="outline" className={DANGLING_TAG_TONE} title={t('tags.dangling')}>
            <TriangleAlertIcon />
            {t('tags.deletedLabel')}
          </Badge>
        )
      )}
    </span>
  );
}
