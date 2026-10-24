/** 构建插件 `build/presets.ts` 提供的虚拟模块：由 `presets/` 合成的预设工作区。 */
declare module 'virtual:preset-workspace' {
  const workspace: import('@/lib/workspace').Workspace;
  export default workspace;
}
