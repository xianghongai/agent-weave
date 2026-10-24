import type { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from 'cn';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** 对话框的两档宽度；没有输入框的对话框需要同样宽度时也用它，不自己写宽度类。 */
export const DIALOG_SIZE_CLASS = {
  narrow: 'sm:max-w-lg',
  wide: 'sm:max-w-3xl',
} as const;

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 只有两档宽度，各表单对话框不再自己写宽度。 */
  size: keyof typeof DIALOG_SIZE_CLASS;
  title: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 带输入框的对话框：点空白处、按 Esc 都不关闭，以免丢失已填的内容。
 * 只能通过关闭按钮、取消或保存关闭。
 */
export function FormDialog({ open, onOpenChange, size, title, children }: FormDialogProps) {
  function handleOpenChange(nextOpen: boolean, eventDetails: DialogPrimitive.Root.ChangeEventDetails) {
    if (!nextOpen && eventDetails.reason === 'escape-key') {
      eventDetails.cancel();
      return;
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      {/* 内容超出视口时整个对话框滚动；自带滚动区的表单用 `min-h-0` 收缩，只滚动自己的内容。 */}
      <DialogContent className={cn('flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto', DIALOG_SIZE_CLASS[size])}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
