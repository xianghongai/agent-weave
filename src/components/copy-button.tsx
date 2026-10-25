import { CheckIcon, CopyIcon, XIcon } from 'lucide-react';
import { type ComponentProps, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

type CopyState = 'idle' | 'copied' | 'failed';

/** 反馈图标显示的时长。 */
const FEEDBACK_MS = 1500;

interface CopyButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick' | 'children'> {
  text: string;
  label: string;
}

/** 把文本写入剪贴板，并在按钮上短暂显示成功或失败。 */
export function CopyButton({ text, label, ...props }: CopyButtonProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') {
      return;
    }
    const timer = window.setTimeout(() => setState('idle'), FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  const Icon = state === 'copied' ? CheckIcon : state === 'failed' ? XIcon : CopyIcon;
  const shown = state === 'copied' ? t('copy.copied') : state === 'failed' ? t('copy.failed') : label;

  return (
    <Button variant="outline" size="sm" onClick={copy} aria-live="polite" {...props}>
      <Icon />
      {shown}
    </Button>
  );
}
