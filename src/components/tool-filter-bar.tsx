import { SearchIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { type FilterOption, FilterSelect } from '@/components/filter-select';
import { Input } from '@/components/ui/input';
import type { Workspace } from '@/lib/workspace';
import { type ToolFilter, compareText } from '@/lib/workspace-operations';

/** 标签筛选的选项：按标识排序的各个标签。工具列表和规则列表共用。 */
export function tagFilterOptions(workspace: Workspace): FilterOption<string>[] {
  return workspace.tags
    .toSorted((a, b) => compareText(a.key, b.key))
    .map((tag) => ({ value: tag.id, label: tag.name }));
}

interface ToolFilterBarProps {
  workspace: Workspace;
  value: ToolFilter;
  onChange: (value: ToolFilter) => void;
}

/** 工具列表的筛选栏：名称关键字与标签，两者同时生效。 */
export function ToolFilterBar({ workspace, value, onChange }: ToolFilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={value.name}
          autoComplete="off"
          spellCheck={false}
          placeholder={t('filters.namePlaceholder')}
          aria-label={t('filters.name')}
          className="w-48 pl-8"
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </div>
      <FilterSelect
        label={t('filters.tag')}
        placeholder={t('filters.tagAll')}
        options={tagFilterOptions(workspace)}
        value={value.tagId}
        onChange={(tagId) => onChange({ ...value, tagId })}
      />
    </div>
  );
}
