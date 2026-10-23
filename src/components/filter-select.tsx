import { cn } from 'cn';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** 筛选条件的下拉框选项。`value` 为 `null` 的一项表示不限，放在最前面。 */
export interface FilterOption<T> {
  value: T | null;
  label: string;
}

interface FilterSelectProps<T extends string> {
  label: string;
  options: FilterOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  className?: string;
}

/** Select 的值只能是字符串，用前缀区分“不限”与具体取值，避免与取值本身混淆。 */
function encode(value: string | null): string {
  return value === null ? 'all' : `value:${value}`;
}

/**
 * 单选的筛选下拉框，供标签、决策、工具类型等筛选条件共用。
 * 当前取值不在选项中（如筛选中的标签被删除）时按“不限”显示。
 */
export function FilterSelect<T extends string>({ label, options, value, onChange, className }: FilterSelectProps<T>) {
  const items = options.map((option) => ({ value: encode(option.value), label: option.label }));
  const current = options.some((option) => option.value === value) ? encode(value) : encode(null);

  return (
    <Select
      items={items}
      value={current}
      onValueChange={(next) => {
        const option = options.find((candidate) => encode(candidate.value) === next);
        if (option) {
          onChange(option.value);
        }
      }}
    >
      <SelectTrigger className={cn('w-36', className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
