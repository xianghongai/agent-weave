import { cn } from 'cn';
import { TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { resolveTags } from '@/lib/workspace-operations';
import { useAppStore } from '@/state/app-store';

/** 标签的配色：全部标签统一用淡淡的品牌色，与灰色的类型、归属标记区分开。 */
export const TAG_TONE = 'border-brand/25 bg-brand/8 text-brand';

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
          <Badge key={id} variant="outline" className={TAG_TONE} title={tag.key}>
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

/**
 * 工具列表项的第一行：标识、描述、标签排成一行，描述放不下时截断，悬停显示全文。
 * `children` 放在标识与描述之间，用于类型、归属等紧跟标识的标记。工具、MCP Server、内置工具和权限规则的列表共用。
 */
export function ToolSummary({
  toolKey,
  description,
  tagIds,
  children,
}: {
  toolKey: string;
  description: string;
  tagIds: readonly string[];
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      <code className="shrink-0 font-mono text-sm font-medium">{toolKey}</code>
      {children}
      <ItemDescription description={description} />
      <span className="shrink-0">
        <TagBadges tagIds={tagIds} />
      </span>
    </div>
  );
}

/**
 * 列表项的描述：一行放不下时截断，悬停显示全文；描述为空时不渲染，不占位置。
 * 工具列表的 `ToolSummary` 与权限规则列表共用。
 */
export function ItemDescription({ description, className }: { description: string; className?: string }) {
  if (!description) {
    return null;
  }
  return (
    <span className={cn('min-w-0 truncate text-sm text-muted-foreground', className)} title={description}>
      {description}
    </span>
  );
}
