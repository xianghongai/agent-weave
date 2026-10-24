import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { contentSecurityPolicy } from './build/content-security-policy';
import { PWA_OPTIONS } from './build/pwa';

export default defineConfig({
  // 资源使用相对路径，同一份构建产物可以部署在 GitHub Pages 子路径、自定义域名或局域网地址下。
  base: './',
  plugins: [
    /**
     * https://inspector.fe-dev.cn/guide/start.html
     * 必须位于 React 插件之前，才能在 JSX 转换前注入源码定位信息。
     * 按 Option/Alt + Shift + 鼠标点击 DOM 元素，即可在 IDE 中打开对应的源代码位置。
     */
    codeInspectorPlugin({ bundler: 'vite', hotKeys: ['ctrlKey', 'shiftKey'] }),
    react(),
    tailwindcss(),
    contentSecurityPolicy(),
    VitePWA(PWA_OPTIONS),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // 图片和字体以独立文件发布，不内联为 data URI。
    assetsInlineLimit: 0,
  },
});
