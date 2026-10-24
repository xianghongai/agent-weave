import { HelpPopover } from '@/components/help-popover';
import { FieldLabel } from '@/components/ui/field';

interface FieldLabelWithHelpProps {
  htmlFor?: string;
  id?: string;
  children: React.ReactNode;
  /** 字段说明，按 Markdown 渲染在标签旁的问号气泡中；`label` 是问号按钮的无障碍标签。 */
  help: { label: string; content: string };
}

/** 字段标签，右侧的问号图标悬停时显示字段说明。 */
export function FieldLabelWithHelp({ htmlFor, id, children, help }: FieldLabelWithHelpProps) {
  return (
    <div className="flex items-center gap-1">
      <FieldLabel htmlFor={htmlFor} id={id}>
        {children}
      </FieldLabel>
      <HelpPopover label={help.label} content={help.content} />
    </div>
  );
}
