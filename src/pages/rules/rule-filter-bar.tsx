import { useTranslation } from 'react-i18next';

import { FilterSelect } from '@/components/filter-select';
import { useTagFilterOptions } from '@/components/tool-filter-bar';
import { DECISIONS, TOOL_TYPES, type Workspace } from '@/lib/workspace';
import { type RuleFilter, agentOwner } from '@/lib/workspace-operations';
import { ToolSelect } from '@/pages/rules/rule-fields';

interface RuleFilterBarProps {
  workspace: Workspace;
  value: RuleFilter;
  onChange: (value: RuleFilter) => void;
}

/** 规则列表的筛选：所指工具（可输入过滤）、工具的标签、决策、工具类型、归属，全部条件同时生效。 */
export function RuleFilterBar({ workspace, value, onChange }: RuleFilterBarProps) {
  const { t } = useTranslation();
  const tagOptions = useTagFilterOptions(workspace);

  return (
    <>
      <ToolSelect
        workspace={workspace}
        value={value.tool}
        onChange={(tool) => onChange({ ...value, tool })}
        clearable
        label={t('filters.tool')}
        placeholder={t('filters.toolAll')}
        className="w-44"
      />
      <FilterSelect
        label={t('filters.tag')}
        options={tagOptions}
        value={value.tagId}
        onChange={(tagId) => onChange({ ...value, tagId })}
      />
      <FilterSelect
        label={t('filters.decision')}
        className="w-28"
        options={[
          { value: null, label: t('filters.decisionAll') },
          ...DECISIONS.map((decision) => ({ value: decision, label: t(`decisions.${decision}`) })),
        ]}
        value={value.decision}
        onChange={(decision) => onChange({ ...value, decision })}
      />
      <FilterSelect
        label={t('filters.toolType')}
        options={[
          { value: null, label: t('filters.toolTypeAll') },
          ...TOOL_TYPES.map((type) => ({ value: type, label: t(`filters.toolTypes.${type}`) })),
        ]}
        value={value.toolType}
        onChange={(toolType) => onChange({ ...value, toolType })}
      />
      <FilterSelect
        label={t('rules.owner')}
        className="w-40"
        options={[
          { value: null, label: t('rules.ownerAll') },
          { value: 'shared', label: t('rules.ownerShared') },
          ...workspace.agents.map((agent) => ({ value: agentOwner(agent.id), label: agent.name })),
        ]}
        value={value.owner}
        onChange={(owner) => onChange({ ...value, owner })}
      />
    </>
  );
}
