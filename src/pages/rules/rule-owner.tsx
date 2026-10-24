import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { escapeMarkdown } from '@/lib/markdown';
import type { Workspace } from '@/lib/workspace';
import type { ResolvedTool } from '@/lib/workspace-operations';

/*
 * 规则的归属：指向内置工具的规则只属于该内置工具所在的 Agent，其余规则所有 Agent 共享。
 */

/** 归属筛选的取值：全部、共享，或某个 Agent 的内部 ID（前缀 `agent:`，避免与前两者混淆）。 */
export type OwnerFilter = 'all' | 'shared' | `agent:${string}`;

/** 规则是否符合归属筛选。 */
export function matchesOwner(tool: ResolvedTool, filter: OwnerFilter): boolean {
  if (filter === 'all') {
    return true;
  }
  if (tool.type !== 'built_in') {
    return filter === 'shared';
  }
  return filter === `agent:${tool.agent.id}`;
}

interface OwnerFilterSelectProps {
  workspace: Workspace;
  value: OwnerFilter;
  onChange: (value: OwnerFilter) => void;
}

export function OwnerFilterSelect({ workspace, value, onChange }: OwnerFilterSelectProps) {
  const { t } = useTranslation();
  const items: { value: OwnerFilter; label: string }[] = [
    { value: 'all', label: t('rules.ownerAll') },
    { value: 'shared', label: t('rules.ownerShared') },
    ...workspace.agents.map((agent) => ({ value: `agent:${agent.id}` as const, label: agent.name })),
  ];
  // 筛选中的 Agent 被删除后回到“全部”。
  const current = items.some((item) => item.value === value) ? value : 'all';

  return (
    <Select
      items={items}
      value={current}
      onValueChange={(next) => {
        const item = items.find((candidate) => candidate.value === next);
        if (item) {
          onChange(item.value);
        }
      }}
    >
      <SelectTrigger className="w-40" aria-label={t('rules.owner')}>
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

/** 规则列表上标明内置工具规则归属的 Agent；共享规则不显示。 */
export function OwnerBadge({ tool }: { tool: ResolvedTool }) {
  return tool.type === 'built_in' ? (
    <Badge variant="outline" className="font-sans">
      {tool.agent.name}
    </Badge>
  ) : null;
}

/**
 * 模式输入框的占位文字和说明，随所选工具的类型变化。
 * 内置工具的路径按以 `/` 结尾的目录前缀填写，并标明规则归属的 Agent。
 */
export function usePatternTexts(tool: ResolvedTool | null): { placeholder: string; hint: string } {
  const { t } = useTranslation();
  if (tool?.type === 'built_in') {
    return {
      placeholder: t('rules.builtInPatternPlaceholder'),
      // 说明按 Markdown 渲染，Agent 名称是用户数据，先转义。
      hint: t('rules.builtInPatternHint', { agent: escapeMarkdown(tool.agent.name) }),
    };
  }
  // MCP 工具的模式是该 Server 提供的工具名。
  if (tool?.type === 'mcp') {
    return { placeholder: t('rules.mcpPatternPlaceholder'), hint: t('rules.mcpPatternHint') };
  }
  return { placeholder: t('rules.patternPlaceholder'), hint: t('rules.patternHint') };
}
