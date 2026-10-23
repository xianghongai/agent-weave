import type { LucideIcon } from 'lucide-react';

interface PageProps {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  /** 页面级操作，显示在标题右侧。 */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** 各页面共用的容器：图标、标题、说明，加上页面内容。 */
export function Page({ icon: Icon, title, description, actions, children }: PageProps) {
  return (
    <div className="py-8 sm:py-10">
      <header className="mb-6 flex flex-wrap items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon className="size-5" />
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground text-pretty">{description}</p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
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
