import { cn } from 'cn';

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
