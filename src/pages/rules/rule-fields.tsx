import { cn } from 'cn';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { DECISION_TONE } from '@/components/decision-tone';
import { Badge } from '@/components/ui/badge';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { filterToolOptions, toolOptions } from '@/lib/tool-options';
import { DECISIONS, type Decision, type ToolRef, type Workspace } from '@/lib/workspace';

/** Combobox 的值只能是字符串，把工具引用编码成“类型:内部 ID”。 */
function encodeToolRef(ref: ToolRef): string {
  return `${ref.type}:${ref.id}`;
}

interface ToolSelectProps {
  id?: string;
  workspace: Workspace;
  value: ToolRef | null;
  onChange: (ref: ToolRef) => void;
  className?: string;
}

/** 选择规则指向的工具：输入文字按标识过滤，内置工具也可以用 Agent 名称搜到。 */
export function ToolSelect({ id, workspace, value, onChange, className }: ToolSelectProps) {
  const { t } = useTranslation();
  const options = useMemo(() => toolOptions(workspace), [workspace]);
  const optionByValue = useMemo(() => new Map(options.map((option) => [encodeToolRef(option.ref), option])), [options]);
  const labelOf = (encoded: string) => optionByValue.get(encoded)?.label ?? encoded;

  return (
    <Combobox
      items={[...optionByValue.keys()]}
      itemToStringLabel={labelOf}
      // 过滤时自动高亮第一项，让 Enter 直接选中它，而不是提交所在的表单。
      autoHighlight
      value={value ? encodeToolRef(value) : null}
      onValueChange={(next) => {
        const option = next ? optionByValue.get(next) : undefined;
        if (option) {
          onChange(option.ref);
        }
      }}
      filter={(item, query) => {
        const option = optionByValue.get(item);
        return option ? filterToolOptions([option], query).length > 0 : false;
      }}
    >
      <ComboboxInput
        id={id}
        aria-label={t('rules.tool')}
        placeholder={t('rules.toolPlaceholder')}
        autoComplete="off"
        spellCheck={false}
        className={cn('w-full font-mono', className)}
      />
      <ComboboxContent>
        <ComboboxList>
          {(item: string) => {
            const option = optionByValue.get(item);
            return option ? (
              <ComboboxItem key={item} value={item} className="font-mono">
                {option.label}
                <ToolTypeBadge type={option.ref.type} />
              </ComboboxItem>
            ) : null;
          }}
        </ComboboxList>
        <ComboboxEmpty>{t('rules.toolNoMatch')}</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}

/** 区分同名的命令工具与 MCP 工具；命令工具不加标记。 */
export function ToolTypeBadge({ type }: { type: ToolRef['type'] }) {
  const { t } = useTranslation();
  if (type !== 'mcp') {
    return null;
  }
  return (
    <Badge variant="outline" className="font-sans">
      {t('rules.mcpBadge')}
    </Badge>
  );
}

interface DecisionToggleProps {
  value: Decision;
  onChange: (decision: Decision) => void;
}

export function DecisionToggle({ value, onChange }: DecisionToggleProps) {
  const { t } = useTranslation();

  return (
    <ToggleGroup
      variant="outline"
      value={[value]}
      onValueChange={(next) => {
        // 单选；再次点击当前项会得到空数组，此时保持原决策，不允许不选。
        const decision = DECISIONS.find((candidate) => next.includes(candidate));
        if (decision) {
          onChange(decision);
        }
      }}
      aria-label={t('rules.decision')}
    >
      {DECISIONS.map((decision) => (
        <ToggleGroupItem key={decision} value={decision} className={cn(value === decision && DECISION_TONE[decision])}>
          {t(`decisions.${decision}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
