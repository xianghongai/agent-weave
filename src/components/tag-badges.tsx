import { TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { resolveTags } from '@/lib/workspace-operations';
import { useAppStore } from '@/state/app-store';

/** 已删除标签的配色：与“询问”决策同为琥珀色，提示需要清理。 */
export const DANGLING_TAG_TONE = 'border-amber-600/40 text-amber-700 dark:border-amber-400/40 dark:text-amber-400';

/**
 * 工具上的标签，按工具上的顺序显示名称。
 * 已被删除的标签只剩内部 ID，显示为带警告符号的“已删除的标签”；内部 ID 不在界面上显示。
 */
export function TagBadges({ tagIds }: { tagIds: readonly string[] }) {
  const { t } = useTranslation();
  const workspace = useAppStore((state) => state.workspace);
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

/** 工具列表项的第一行：标识和标签排成一行，标签紧跟在标识右边，放不下时换行。工具、MCP Server、内置工具的列表共用。 */
export function KeyWithTags({ toolKey, tagIds }: { toolKey: string; tagIds: readonly string[] }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <code className="min-w-0 truncate font-mono text-sm font-medium">{toolKey}</code>
      <TagBadges tagIds={tagIds} />
    </div>
  );
}
