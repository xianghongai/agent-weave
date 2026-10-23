import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// 与 vite.config.ts 分开：那里带着只用于构建的插件。
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: { include: ['test/**/*.test.ts'] },
});
