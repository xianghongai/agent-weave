import { Markdown } from '@/components/markdown';

interface MarkdownFieldDescriptionProps {
  /** 供输入框的 `aria-describedby` 引用。 */
  id?: string;
  /** Markdown 源文本，通常来自 `t()`。 */
  children: string;
}

/**
 * 含代码的字段说明，按 Markdown 渲染，样式与 `FieldDescription` 一致。
 * `FieldDescription` 是段落，放不下 Markdown 输出的块级元素，所以外层用 div。
 */
export function MarkdownFieldDescription({ id, children }: MarkdownFieldDescriptionProps) {
  return (
    <div id={id} className="text-sm leading-normal text-muted-foreground">
      <Markdown>{children}</Markdown>
    </div>
  );
}
