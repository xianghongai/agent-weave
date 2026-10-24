import { CircleHelpIcon } from 'lucide-react';

import { Markdown } from '@/components/markdown';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface HelpPopoverProps {
  /** 问号按钮的无障碍标签，说明这个气泡解释的是什么。 */
  label: string;
  /** 气泡正文，按 Markdown 渲染。 */
  content: string;
}

/** 问号图标按钮，悬停时在气泡中显示说明。 */
export function HelpPopover({ label, content }: HelpPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        render={
          // 负外边距让图标按钮不撑高所在的行，与同一行的标签、标题对齐。
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="-my-1 text-muted-foreground data-popup-open:text-brand"
            aria-label={label}
          />
        }
      >
        <CircleHelpIcon />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] text-pretty">
        <Markdown>{content}</Markdown>
      </PopoverContent>
    </Popover>
  );
}
