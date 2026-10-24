import { useTranslation } from 'react-i18next';

import { HelpPopover } from '@/components/help-popover';
import { FieldLabel } from '@/components/ui/field';

interface PatternLabelProps {
  htmlFor: string;
  /** 按所选工具类型给出的模式说明，见 `usePatternTexts`。 */
  hint: string;
}

/** “模式”标签，右侧的问号图标悬停时显示模式说明。 */
export function PatternLabel({ htmlFor, hint }: PatternLabelProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      <FieldLabel htmlFor={htmlFor}>{t('rules.pattern')}</FieldLabel>
      <HelpPopover label={t('rules.patternHelp')} content={hint} />
    </div>
  );
}
