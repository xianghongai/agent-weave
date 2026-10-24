import { TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { tagToneIndex } from '@/lib/tag-tone';
import { resolveTags } from '@/lib/workspace-operations';
import { useAppStore } from '@/state/app-store';

/**
 * 标签的配色，按内部 ID 固定选用其一。
 * 避开决策与警告已占用的绿、黄、红，免得标签被误读成决策或提示。
 */
const TAG_TONES = [
  'border-sky-600/30 bg-sky-500/10 text-sky-700 dark:border-sky-400/30 dark:text-sky-300',
  'border-violet-600/30 bg-violet-500/10 text-violet-700 dark:border-violet-400/30 dark:text-violet-300',
  'border-fuchsia-600/30 bg-fuchsia-500/10 text-fuchsia-700 dark:border-fuchsia-400/30 dark:text-fuchsia-300',
  'border-indigo-600/30 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/30 dark:text-indigo-300',
  'border-cyan-600/30 bg-cyan-500/10 text-cyan-700 dark:border-cyan-400/30 dark:text-cyan-300',
  'border-pink-600/30 bg-pink-500/10 text-pink-700 dark:border-pink-400/30 dark:text-pink-300',
];

export function tagTone(id: string): string {
  return TAG_TONES[tagToneIndex(id, TAG_TONES.length)] ?? '';
}

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
          <Badge key={id} variant="outline" className={tagTone(id)} title={tag.key}>
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
      {description && (
        <span className="min-w-0 truncate text-sm text-muted-foreground" title={description}>
          {description}
        </span>
      )}
      <span className="shrink-0">
        <TagBadges tagIds={tagIds} />
      </span>
    </div>
  );
}
