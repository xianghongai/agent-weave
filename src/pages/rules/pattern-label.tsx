import { CircleHelpIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PatternLabelProps {
  htmlFor: string;
  /** 按所选工具类型给出的模式说明，见 `usePatternTexts`。 */
  hint: string;
}

/** “模式”标签，右侧的问号图标打开模式说明：桌面悬停打开，触屏点击打开。 */
export function PatternLabel({ htmlFor, hint }: PatternLabelProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      <FieldLabel htmlFor={htmlFor}>{t('rules.pattern')}</FieldLabel>
      <Popover>
        <PopoverTrigger
          openOnHover
          render={
            // 负外边距让图标按钮不撑高标签行，与同一行其他字段的标签对齐。
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="-my-1 text-muted-foreground"
              aria-label={t('rules.patternHelp')}
            />
          }
        >
          <CircleHelpIcon />
        </PopoverTrigger>
        <PopoverContent align="start" className="text-pretty">
          {hint}
        </PopoverContent>
      </Popover>
    </div>
  );
}
