import { cn } from 'cn';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

interface NoticeSectionProps {
  icon: LucideIcon;
  /** 标题和图标的配色，默认为品牌色图标。 */
  tone?: string;
  title: string;
  /** 条目数，显示在标题旁；省略时不显示。 */
  count?: number;
  hint: string;
  children?: React.ReactNode;
}

/** “重要提示”Tab 中的一类提示：带图标的标题、条目数、说明，以及条目列表。 */
export function NoticeSection({ icon: Icon, tone, title, count, hint, children }: NoticeSectionProps) {
  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h2 className={cn('flex items-center gap-2 font-medium', tone)}>
          <Icon className={cn('size-4', !tone && 'text-brand')} />
          {title}
          {count !== undefined && <Badge variant="secondary">{count}</Badge>}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}
