import presetWorkspaces from 'virtual:preset-workspace';

import type { Language } from '@/lib/language';
import type { Workspace } from '@/lib/workspace';

/*
 * 预设：随站点发布的初始工作区内容，每种界面语言一份，只有文字不同。
 * 数据是仓库根目录 `presets/` 下的 JSONC，构建时由 `build/presets.ts` 按语言合成，以虚拟模块提供，见 ADR 0004、ADR 0005。
 */

/** 返回某种语言的预设工作区的独立副本，调用方可以放心持有。 */
export function createPresetWorkspace(language: Language): Workspace {
  return structuredClone(presetWorkspaces[language]);
}
