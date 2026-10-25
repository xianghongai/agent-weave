import { SearchIcon, ShieldAlertIcon } from 'lucide-react';
import { cn } from 'cn';
import { useTranslation } from 'react-i18next';

import { type FilterOption, FilterSelect } from '@/components/filter-select';
import { HIGH_RISK_TONE } from '@/components/high-risk';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
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

/** 工具列表的筛选栏：名称关键字、标签和只看高危，同时生效。 */
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
      <Toggle
        variant="outline"
        pressed={value.highRisk}
        onPressedChange={(highRisk) => onChange({ ...value, highRisk })}
        aria-label={t('filters.highRisk')}
        title={t('filters.highRisk')}
        // 按下时文字保持警示色，悬停也不被变体的 hover 文字色覆盖。
        className={cn(value.highRisk && [HIGH_RISK_TONE, 'hover:text-destructive'])}
      >
        <ShieldAlertIcon />
        {t('notices.highRiskFlag')}
      </Toggle>
    </div>
  );
}
