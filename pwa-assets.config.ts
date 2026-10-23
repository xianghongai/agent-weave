import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// 图标以 public/favicon.svg 为源，生成后提交进仓库；改了源图标后运行 `pnpm pwa:icons` 重新生成。
// 深色底填满平台显示为不透明方块的图标的四角，与 favicon 的底色一致。
const background = '#17181c';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
});
