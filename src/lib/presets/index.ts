import { ANTIGRAVITY } from '@/lib/presets/agents/antigravity';
import { CLAUDE_CODE } from '@/lib/presets/agents/claude-code';
import { PRESET_COMMAND_TOOLS } from '@/lib/presets/command-tools';
import { PRESET_RULES } from '@/lib/presets/rules';
import { SCHEMA_VERSION, type Workspace } from '@/lib/workspace';

/*
 * 预设：随站点发布的初始工作区内容。
 * 源码按实体拆分，每个 Agent 定义一个文件，在模块加载时合成一份默认工作区。
 */

/** 预设的修改时间固定不变，任何一次编辑都会比它新。 */
const PRESET_UPDATED_AT = '2026-10-23T00:00:00.000Z';

const PRESET_WORKSPACE: Workspace = {
  schema_version: SCHEMA_VERSION,
  updated_at: PRESET_UPDATED_AT,
  tags: [],
  command_tools: PRESET_COMMAND_TOOLS,
  mcp_servers: [],
  agents: [CLAUDE_CODE, ANTIGRAVITY],
  rules: PRESET_RULES,
};

/** 返回预设工作区的独立副本，调用方可以放心持有。 */
export function createPresetWorkspace(): Workspace {
  return structuredClone(PRESET_WORKSPACE);
}
