import { cn } from 'cn';
import { XIcon } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** 筛选条件的下拉框选项。不限不是一个选项，由占位文字表示，选中后用清除按钮回到不限。 */
export interface FilterOption<T> {
  value: T;
  label: string;
}

interface FilterSelectProps<T extends string> {
  label: string;
  /** 不限时显示的文字，如“全部标签”。 */
  placeholder: string;
  options: FilterOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  className?: string;
}

/**
 * 单选的筛选下拉框，供标签、决策、工具类型等筛选条件共用。
 * 选中后显示清除按钮，回到不限；当前取值不在选项中（如筛选中的标签被删除）时按不限显示。
 */
export function FilterSelect<T extends string>({
  label,
  placeholder,
  options,
  value,
  onChange,
  className,
}: FilterSelectProps<T>) {
  const { t } = useTranslation();
  const current = options.some((option) => option.value === value) ? value : null;
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <Select items={options} value={current} onValueChange={(next) => onChange(next)}>
        {/* 有取值时清除按钮占据下拉箭头的位置，与工具筛选的输入框一致。 */}
        <SelectTrigger
          ref={triggerRef}
          className={cn('w-36', current !== null && '[&>svg]:invisible', className)}
          aria-label={label}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        {/* 关闭“选中项对齐触发器”：否则选中靠后的项时，弹出面板会上移盖住触发器。 */}
        <SelectContent align="start" alignItemWithTrigger={false}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current !== null && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          aria-label={t('filters.clear')}
          onClick={() => {
            // 清除后按钮随即卸载，焦点交还给下拉框，避免落到页面根部。
            triggerRef.current?.focus();
            onChange(null);
          }}
        >
          <XIcon />
        </Button>
      )}
    </div>
  );
}
