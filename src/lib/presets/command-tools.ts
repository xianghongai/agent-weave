import type { CommandTool } from '@/lib/workspace';

/** 预设命令工具。内部 ID 是固定值，“合并预设”按它判断条目是否已存在。 */
export const PRESET_COMMAND_TOOLS: CommandTool[] = [
  { id: 'preset-command-git', key: 'git', description: '版本控制', tag_ids: [], high_risk: false },
  { id: 'preset-command-pnpm', key: 'pnpm', description: 'Node.js 包管理', tag_ids: [], high_risk: false },
  { id: 'preset-command-ls', key: 'ls', description: '列出目录内容', tag_ids: [], high_risk: false },
  { id: 'preset-command-rg', key: 'rg', description: '按内容搜索文件', tag_ids: [], high_risk: false },
  { id: 'preset-command-rm', key: 'rm', description: '删除文件', tag_ids: [], high_risk: true },
  { id: 'preset-command-sudo', key: 'sudo', description: '以超级用户身份执行', tag_ids: [], high_risk: true },
];
