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

interface ToolSelectBaseProps {
  id?: string;
  workspace: Workspace;
  value: ToolRef | null;
  /** 默认是表单字段的文案；用于筛选时换成筛选的文案。 */
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

/**
 * 表单中必须选一个工具，不提供清除；用于筛选时显示清除按钮，清除后回到未选择（`null`）。
 * 用 `clearable` 区分两种用法，表单一侧的 `onChange` 不会收到 `null`。
 */
type ToolSelectProps = ToolSelectBaseProps &
  (
    | { clearable?: false; onChange: (ref: ToolRef) => void }
    | { clearable: true; onChange: (ref: ToolRef | null) => void }
  );

/** 选择规则指向的工具：输入文字按标识过滤，内置工具也可以用 Agent 名称搜到。 */
export function ToolSelect(props: ToolSelectProps) {
  const { id, workspace, value, label, placeholder, autoFocus, className } = props;
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
        if (next === null) {
          if (props.clearable) {
            props.onChange(null);
          }
          return;
        }
        const option = optionByValue.get(next);
        if (option) {
          props.onChange(option.ref);
        }
      }}
      filter={(item, query) => {
        const option = optionByValue.get(item);
        return option ? filterToolOptions([option], query).length > 0 : false;
      }}
    >
      <ComboboxInput
        id={id}
        autoFocus={autoFocus}
        showClear={props.clearable === true && value !== null}
        aria-label={label ?? t('rules.tool')}
        placeholder={placeholder ?? t('rules.toolPlaceholder')}
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
