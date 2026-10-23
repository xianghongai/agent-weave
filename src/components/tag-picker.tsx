import { cn } from 'cn';
import { TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DANGLING_TAG_TONE } from '@/components/tag-badges';
import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { compareText } from '@/lib/workspace-operations';
import { useWorkspace } from '@/state/workspace-store';

interface TagPickerProps {
  /** 选中的标签 ID，按选择顺序排列。 */
  value: readonly string[];
  onChange: (value: string[]) => void;
}

/**
 * 工具对话框中的标签多选：全部标签按标识排序，点击切换。
 * 工具上残留的已删除标签排在最后，带警告符号，取消选中即可移除；不能再次选中。
 */
export function TagPicker({ value, onChange }: TagPickerProps) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const tags = workspace.tags.toSorted((a, b) => compareText(a.key, b.key));
  const dangling = value.filter((id) => !workspace.tags.some((tag) => tag.id === id));

  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label">{t('tags.field')}</FieldLegend>
      {tags.length === 0 && dangling.length === 0 ? (
        <FieldDescription>{t('tags.fieldEmpty')}</FieldDescription>
      ) : (
        <>
          <ToggleGroup
            multiple
            variant="outline"
            size="sm"
            className="flex-wrap"
            value={[...value]}
            onValueChange={(next) => {
              // 保持已选标签的原有顺序，新选中的追加在后面。
              onChange([...value.filter((id) => next.includes(id)), ...next.filter((id) => !value.includes(id))]);
            }}
            aria-label={t('tags.field')}
          >
            {tags.map((tag) => (
              <ToggleGroupItem key={tag.id} value={tag.id} title={tag.key}>
                {tag.name}
              </ToggleGroupItem>
            ))}
            {dangling.map((id) => (
              <ToggleGroupItem
                key={id}
                value={id}
                className={cn('font-mono', DANGLING_TAG_TONE)}
                title={t('tags.dangling')}
                aria-label={t('tags.danglingLabel', { id })}
              >
                <TriangleAlertIcon />
                {id}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>
            {t('tags.fieldHint')}
            {dangling.length > 0 && t('tags.fieldDanglingHint')}
          </FieldDescription>
        </>
      )}
    </FieldSet>
  );
}
