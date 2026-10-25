import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { presets } from './build/presets';

// 与 vite.config.ts 分开：那里带着只用于构建的插件。预设插件除外，`@/lib/presets` 依赖它提供的虚拟模块。
export default defineConfig({
  plugins: [presets()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: { include: ['test/**/*.test.ts'] },
});
