import MarkdownToJsx, { type MarkdownToJSX } from 'markdown-to-jsx/react';
import { cn } from 'cn';

function MarkdownLink(props: React.ComponentProps<'a'>) {
  return (
    <a
      {...props}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-brand underline-offset-4 hover:underline"
    />
  );
}

function MarkdownCode(props: React.ComponentProps<'code'>) {
  return (
    <code {...props} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] wrap-break-word text-foreground" />
  );
}

function MarkdownUnorderedList(props: React.ComponentProps<'ul'>) {
  return <ul {...props} className="grid list-disc gap-1 pl-4 marker:text-muted-foreground" />;
}

function MarkdownOrderedList(props: React.ComponentProps<'ol'>) {
  return <ol {...props} className="grid list-decimal gap-1 pl-4 marker:text-muted-foreground" />;
}

const OPTIONS: MarkdownToJSX.Options = {
  // 文案里插入的用户数据不转义，关闭原始 HTML 解析后它们也只会显示成文字。
  disableParsingRawHTML: true,
  // 始终输出包裹元素，`className` 才能落到单行文案上。
  forceWrapper: true,
  overrides: {
    a: MarkdownLink,
    code: MarkdownCode,
    ul: MarkdownUnorderedList,
    ol: MarkdownOrderedList,
  },
};

interface MarkdownProps {
  /** Markdown 源文本，通常来自 `t()`。 */
  children: string;
  className?: string;
}

/** 渲染说明文案中的 Markdown：行内代码、列表、链接使用站点样式，链接在新标签页打开。 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <MarkdownToJsx options={OPTIONS} className={cn('space-y-2', className)}>
      {children}
    </MarkdownToJsx>
  );
}
