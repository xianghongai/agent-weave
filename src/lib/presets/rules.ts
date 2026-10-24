import { PRESET_COMMAND_TOOLS, presetCommandId } from '@/lib/presets/command-tools';
import { PRESET_MCP_SERVERS } from '@/lib/presets/mcp-servers';
import { NOT_HIGH_RISK, type Decision, type Rule } from '@/lib/workspace';

/** 针对命令工具的规则。`slug` 与命令工具内部 ID 的后缀相同。 */
function commandRule(id: string, slug: string, pattern: string, decision: Decision): Rule {
  return {
    id: `preset-rule-${id}`,
    tool: { type: 'command', id: presetCommandId(slug) },
    pattern,
    decision,
    description: '',
    ...NOT_HIGH_RISK,
  };
}

/*
 * 不整体允许的命令：`rm` 整体询问，`sudo` 整体拒绝；
 * `dd`、`mkfs`、`chmod`、`chown` 两份配置都没有放行，不写规则，交给各 Agent 的默认行为（通常是询问）。
 * 其余预设命令都整体允许。
 */
const NOT_ALLOWED_AS_WHOLE = new Set(['rm', 'sudo', 'dd', 'mkfs', 'chmod', 'chown']);

const SLUG_PREFIX = presetCommandId('');

/** 整体允许的命令，规则 ID 为 `preset-rule-<命令 ID 后缀>-allow`。 */
const COMMAND_ALLOW_RULES: Rule[] = PRESET_COMMAND_TOOLS.filter((tool) => !NOT_ALLOWED_AS_WHOLE.has(tool.key)).map(
  (tool) => {
    const slug = tool.id.slice(SLUG_PREFIX.length);
    return commandRule(`${slug}-allow`, slug, '', 'allow');
  }
);

/*
 * 整体允许之外的特定询问与拒绝。各家都是 deny 优先，“整体允许加特定拒绝”的组合有效。
 * 被更宽规则完全覆盖的规则不收录，如已有 `sudo` 拒绝时不再单列 `sudo rm`。
 * 只是前缀相近、并不互相覆盖的规则都保留，如 `git clean -f` 与 `git clean -fd`、`git push --force` 与 `git push -f`。
 */
const COMMAND_SPECIFIC_RULES: Rule[] = [
  commandRule('rm-ask', 'rm', '', 'ask'),
  commandRule('rm-rf-root-deny', 'rm', '-rf /', 'deny'),
  commandRule('rm-rf-home-deny', 'rm', '-rf ~', 'deny'),
  commandRule('sudo-deny', 'sudo', '', 'deny'),
  commandRule('git-push-force-deny', 'git', 'push --force', 'deny'),
  commandRule('git-push-f-deny', 'git', 'push -f', 'deny'),
  commandRule('git-reset-hard-deny', 'git', 'reset --hard', 'deny'),
  commandRule('git-clean-fd-deny', 'git', 'clean -fd', 'deny'),
  commandRule('git-clean-f-deny', 'git', 'clean -f', 'deny'),
  commandRule('git-branch-force-delete-deny', 'git', 'branch -D', 'deny'),
  commandRule('docker-system-prune-volumes-deny', 'docker', 'system prune -a --volumes', 'deny'),
  commandRule('docker-run-privileged-deny', 'docker', 'run --privileged', 'deny'),
  commandRule('docker-run-socket-deny', 'docker', 'run -v /var/run/docker.sock', 'deny'),
];

/** 允许整个 MCP Server。每个预设 MCP Server 各有一条，不设“全部 MCP”的规则。 */
const MCP_ALLOW_RULES: Rule[] = PRESET_MCP_SERVERS.map((server) => ({
  id: `preset-rule-mcp-${server.key}-allow`,
  tool: { type: 'mcp', id: server.id },
  pattern: '',
  decision: 'allow',
  description: '',
  ...NOT_HIGH_RISK,
}));

/** 预设的共享权限规则，所有 Agent 共用。 */
export const PRESET_RULES: Rule[] = [...COMMAND_ALLOW_RULES, ...COMMAND_SPECIFIC_RULES, ...MCP_ALLOW_RULES];
