import type { Decision } from '@/lib/workspace';

/** 决策的文字配色：允许为绿、询问为黄、拒绝为红。规则列表和输出页共用。 */
export const DECISION_TONE: Record<Decision, string> = {
  allow: 'text-emerald-700 dark:text-emerald-400',
  ask: 'text-amber-700 dark:text-amber-400',
  deny: 'text-destructive',
};
