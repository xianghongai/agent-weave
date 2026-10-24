import type { LucideIcon } from 'lucide-react';

import { HelpPopover } from '@/components/help-popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PageProps {
  icon: LucideIcon;
  title: string;
  /** 宽屏下放不下时截断，悬停显示全文，所以只接受纯文本。 */
  description: string;
  /** 补充说明，按 Markdown 渲染在标题旁的问号气泡中；`label` 是问号按钮的无障碍标签。 */
  help?: { label: string; content: string };
  /** 页面级操作，显示在标题行的最右侧。 */
  actions?: React.ReactNode;
  /**
   * 宽屏下内容区的滚动方式。
   * `all`：标题以下的全部内容一起滚动。
   * `custom`：内容区是填满剩余高度的纵向 flex 容器，页面自己用 `PageScroll` 包住要滚动的部分，其余部分固定。
   * 窄屏下两种方式都是整页滚动。
   */
  scroll?: 'all' | 'custom';
  children: React.ReactNode;
}

/**
 * 各页面共用的容器：一行标题区，加上页面内容。
 * 宽屏下填满外壳主区域的剩余高度，标题区固定，内容区按 `scroll` 滚动。
 */
export function Page({ icon: Icon, title, description, help, actions, scroll = 'all', children }: PageProps) {
  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      {/* 窄屏下说明换到标题下方；宽屏下图标、标题、问号、说明、操作排成一行。 */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 py-4 md:flex-nowrap">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon className="size-4" />
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {help && <HelpPopover label={help.label} content={help.content} />}
        </div>
        <p
          title={description}
          className="order-last basis-full text-sm text-pretty text-muted-foreground md:order-none md:min-w-0 md:flex-1 md:basis-auto md:truncate"
        >
          {description}
        </p>
        {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {scroll === 'all' ? (
        <PageScroll>{children}</PageScroll>
      ) : (
        <div className="flex flex-col md:min-h-0 md:flex-1">{children}</div>
      )}
    </div>
  );
}

/**
 * 页面内的滚动区：宽屏下填满所在纵向 flex 容器的剩余高度，在 Scroll Area 中滚动；窄屏下随整页滚动。
 * 宽屏下两侧伸进页面的水平内边距，给滚动条和焦点环留出位置，内容仍与上方对齐。
 * 窄屏下覆盖 Base UI 写在视口上的 `overflow: scroll`，不形成滚动容器，以免裁掉焦点环或截住触摸滚动。
 * `framed`：滚动区本身就是带圆角边框的列表框，用于列表页。
 */
export function PageScroll({ framed = false, children }: { framed?: boolean; children: React.ReactNode }) {
  if (framed) {
    return <FramedScroll>{children}</FramedScroll>;
  }
  return (
    <ScrollArea className="max-md:[&>[data-slot=scroll-area-viewport]]:overflow-visible! md:-mx-3 md:mb-6 md:min-h-0 md:flex-1">
      <div className="pb-6 md:px-3 md:pb-1">{children}</div>
    </ScrollArea>
  );
}

/**
 * 带圆角边框的滚动框：边框本身固定，内容在框内滚动，列表短时框随内容收缩。
 * 宽屏下框和视口都是纵向 flex 子项，靠 `min-h-0` 收缩到剩余高度，不依赖百分比高度。
 */
function FramedScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea className="mb-6 overflow-hidden rounded-xl border max-md:[&>[data-slot=scroll-area-viewport]]:overflow-visible! md:flex md:min-h-0 md:flex-col md:[&>[data-slot=scroll-area-viewport]]:h-auto md:[&>[data-slot=scroll-area-viewport]]:min-h-0">
      {children}
    </ScrollArea>
  );
}

/** 页面内的小提示块，用于说明和警告。 */
export function Note({
  tone = 'info',
  icon: Icon,
  children,
}: {
  tone?: 'info' | 'warning';
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tone === 'warning'
          ? 'flex gap-2.5 rounded-lg bg-brand/10 p-3 text-sm text-foreground'
          : 'flex gap-2.5 rounded-lg bg-muted p-3 text-sm text-muted-foreground'
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" />
      <div className="grid gap-1 text-pretty">{children}</div>
    </div>
  );
}
