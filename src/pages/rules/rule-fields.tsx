import { cn } from 'cn';
import { useTranslation } from 'react-i18next';

import { DECISION_TONE } from '@/components/decision-tone';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DECISIONS, type Decision, type ToolRef, type Workspace } from '@/lib/workspace';
import { compareText } from '@/lib/workspace-operations';

/** Select 的值只能是字符串，把工具引用编码成“类型:内部 ID”。 */
function encodeToolRef(ref: ToolRef): string {
  return `${ref.type}:${ref.id}`;
}

type ToolOption = { value: string; label: string; ref: ToolRef };

/** 规则可以指向的工具：先按工具类型（命令、MCP、内置），同类内按标识排序，与规则列表一致。 */
function toolOptions(workspace: Workspace): ToolOption[] {
  return [
    ...sharedToolOptions('command', workspace.command_tools),
    ...sharedToolOptions('mcp', workspace.mcp_servers),
    ...builtInToolOptions(workspace),
  ];
}

/** 共享工具（命令工具、MCP 工具）的选项，按标识排序。 */
function sharedToolOptions(type: 'command' | 'mcp', tools: { id: string; key: string }[]): ToolOption[] {
  return tools
    .toSorted((a, b) => compareText(a.key, b.key))
    .map((tool) => {
      const ref: ToolRef = { type, id: tool.id };
      return { value: encodeToolRef(ref), label: tool.key, ref };
    });
}

/** 内置工具按 Agent 的顺序排列，标签带上所属 Agent 的名称，以便区分同名工具并标明规则归属。 */
function builtInToolOptions(workspace: Workspace): ToolOption[] {
  return workspace.agents.flatMap((agent) =>
    agent.built_in_tools
      .toSorted((a, b) => compareText(a.key, b.key))
      .map((tool) => {
        const ref: ToolRef = { type: 'built_in', id: tool.id };
        return { value: encodeToolRef(ref), label: `${tool.key} · ${agent.name}`, ref };
      })
  );
}

interface ToolSelectProps {
  id?: string;
  workspace: Workspace;
  value: ToolRef | null;
  onChange: (ref: ToolRef) => void;
  className?: string;
}

export function ToolSelect({ id, workspace, value, onChange, className }: ToolSelectProps) {
  const { t } = useTranslation();
  const options = toolOptions(workspace);

  return (
    <Select
      items={options.map(({ value: optionValue, label }) => ({ value: optionValue, label }))}
      value={value ? encodeToolRef(value) : null}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate.value === next);
        if (option) {
          onChange(option.ref);
        }
      }}
    >
      <SelectTrigger id={id} className={cn('w-full font-mono', className)}>
        <SelectValue placeholder={t('rules.toolPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="font-mono">
            {option.label}
            <ToolTypeBadge type={option.ref.type} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
