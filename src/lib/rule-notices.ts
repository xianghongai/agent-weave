import type { Notice } from '@/lib/notices';
import type { Rule } from '@/lib/workspace';
import type { RuleListItem } from '@/lib/workspace-operations';

/*
 * 规则上的提示：高危与冲突。
 * 生成用它给某个 Agent 实际写进输出的规则计算提示；规则列表用它给全部规则显示图标。
 * 只提醒，不影响输出。
 */

/**
 * 写入类内置工具的这些模式等于放开整个文件系统或整个主目录。
 * 按原始模式判断，`{{home}}` 尚未展开。
 */
const BROAD_WRITE_PATTERNS: ReadonlySet<string> = new Set(['', '/', '~/', '{{home}}/']);

/** 这条规则是否高危。只有 `allow` 规则会被判为高危。 */
function isHighRisk({ rule, tool }: RuleListItem): boolean {
  if (rule.decision !== 'allow') {
    return false;
  }
  if (rule.high_risk || tool.tool.high_risk) {
    return true;
  }
  return tool.type === 'built_in' && tool.tool.writes && BROAD_WRITE_PATTERNS.has(rule.pattern);
}

/**
 * 同一工具、同一模式出现不同决策的规则组。
 * 每组带上该工具、该模式下的全部规则，组内与组间都按传入顺序排列。
 */
function conflicts(items: RuleListItem[]): Notice[] {
  const groups = new Map<string, Rule[]>();
  for (const { rule } of items) {
    const key = JSON.stringify([rule.tool.type, rule.tool.id, rule.pattern]);
    const group = groups.get(key);
    if (group) {
      group.push(rule);
    } else {
      groups.set(key, [rule]);
    }
  }
  return [...groups.values()]
    .filter((group) => new Set(group.map((rule) => rule.decision)).size > 1)
    .map((group) => ({ type: 'conflict', ruleIds: group.map((rule) => rule.id) }));
}

/** 先列出高危提示，再列出冲突提示，各自按传入的规则顺序排列。 */
export function ruleNotices(items: RuleListItem[]): Notice[] {
  const highRisk: Notice[] = items.filter(isHighRisk).map(({ rule }) => ({ type: 'highRisk', ruleId: rule.id }));
  return [...highRisk, ...conflicts(items)];
}
