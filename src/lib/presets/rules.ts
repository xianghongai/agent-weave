import type { Decision, Rule } from '@/lib/workspace';

function commandRule(id: string, toolId: string, pattern: string, decision: Decision): Rule {
  return { id, tool: { type: 'command', id: toolId }, pattern, decision, high_risk: false };
}

/** 预设的共享权限规则，所有 Agent 共用。 */
export const PRESET_RULES: Rule[] = [
  commandRule('preset-rule-git-allow', 'preset-command-git', '', 'allow'),
  commandRule('preset-rule-git-push-ask', 'preset-command-git', 'push', 'ask'),
  commandRule('preset-rule-git-push-force-deny', 'preset-command-git', 'push --force', 'deny'),
  commandRule('preset-rule-pnpm-allow', 'preset-command-pnpm', '', 'allow'),
  commandRule('preset-rule-pnpm-publish-ask', 'preset-command-pnpm', 'publish', 'ask'),
  commandRule('preset-rule-ls-allow', 'preset-command-ls', '', 'allow'),
  commandRule('preset-rule-rg-allow', 'preset-command-rg', '', 'allow'),
  commandRule('preset-rule-rm-ask', 'preset-command-rm', '', 'ask'),
  commandRule('preset-rule-sudo-deny', 'preset-command-sudo', '', 'deny'),
];
