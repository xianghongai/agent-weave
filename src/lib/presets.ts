import presetWorkspace from 'virtual:preset-workspace';

import type { Workspace } from '@/lib/workspace';

/*
 * 预设：随站点发布的初始工作区内容。
 * 数据是仓库根目录 `presets/` 下的 JSONC，构建时由 `build/presets.ts` 合成，以虚拟模块提供，见 ADR 0004。
 */

/** 返回预设工作区的独立副本，调用方可以放心持有。 */
export function createPresetWorkspace(): Workspace {
  return structuredClone(presetWorkspace);
}
