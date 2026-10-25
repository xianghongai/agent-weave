import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { escapeMarkdown } from '@/lib/markdown';
import type { ResolvedTool } from '@/lib/workspace-operations';

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
