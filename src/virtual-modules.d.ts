/** 构建插件 `build/presets.ts` 提供的虚拟模块：由 `presets/` 按每种界面语言合成的预设工作区。 */
declare module 'virtual:preset-workspace' {
  const workspaces: Record<import('@/lib/language').Language, import('@/lib/workspace').Workspace>;
  export default workspaces;
}
