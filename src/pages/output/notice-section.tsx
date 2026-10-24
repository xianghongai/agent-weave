import { cn } from 'cn';
import type { LucideIcon } from 'lucide-react';

import { HIGH_RISK_TONE } from '@/components/high-risk';
import { Markdown } from '@/components/markdown';
import { Badge } from '@/components/ui/badge';

/** 提示的性质：高危、需要留意，或只是说明。 */
type NoticeTone = 'highRisk' | 'warning' | 'neutral';

/** 各性质下标题与图标的配色；只是说明的提示只给图标配品牌色。 */
const TONE_CLASS: Record<NoticeTone, { title?: string; icon: string }> = {
  highRisk: { title: HIGH_RISK_TONE, icon: HIGH_RISK_TONE },
  warning: { title: 'text-amber-700 dark:text-amber-400', icon: 'text-amber-700 dark:text-amber-400' },
  neutral: { icon: 'text-brand' },
};

interface NoticeSectionProps {
  icon: LucideIcon;
  /** 决定标题和图标的配色，默认为 `neutral`。 */
  tone?: NoticeTone;
  title: string;
  /** 条目数，显示在标题旁；省略时不显示。 */
  count?: number;
  /** 说明，按 Markdown 渲染。 */
  hint: string;
  children?: React.ReactNode;
}

/** “重要提示”Tab 中的一类提示：带图标的标题、条目数、说明，以及条目列表。 */
export function NoticeSection({ icon: Icon, tone = 'neutral', title, count, hint, children }: NoticeSectionProps) {
  const toneClass = TONE_CLASS[tone];
  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h2 className={cn('flex items-center gap-2 font-medium', toneClass.title)}>
          <Icon className={cn('size-4', toneClass.icon)} />
          {title}
          {count !== undefined && <Badge variant="secondary">{count}</Badge>}
        </h2>
        <Markdown className="text-sm text-pretty text-muted-foreground">{hint}</Markdown>
      </div>
      {children}
    </section>
  );
}
