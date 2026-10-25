import type { VitePWAOptions } from 'vite-plugin-pwa';

/** 与 index.html 的 theme-color 和图标底色一致。 */
const BRAND_BACKGROUND = '#17181c';

/**
 * PWA 配置：站点可以安装，并在断网后打开。
 * Service Worker 只预缓存构建产物，不做运行时缓存，也不缓存用户数据：
 * 工作区在 localStorage 中，Gist 同步的请求直接走网络，离线时如实失败。
 * CSP 的 `connect-src` 不需要为它放宽，`worker-src 'self'` 和 `manifest-src 'self'` 已经够用。
 */
export const PWA_OPTIONS: Partial<VitePWAOptions> = {
  // 由 src/components/pwa-prompt.tsx 注册；新版本先等待，用户确认后才刷新。
  registerType: 'prompt',
  injectRegister: false,
  manifest: {
    name: 'Agent Weave',
    short_name: 'Agent Weave',
    // 清单在脚本运行前就被读取，不随界面语言变化，统一写英文。
    description:
      'Maintain one neutral rule set in your browser and generate permission and MCP configurations for multiple AI coding agents.',
    lang: 'en',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: BRAND_BACKGROUND,
    theme_color: BRAND_BACKGROUND,
    icons: [
      { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // 预缓存整个站点（含字体），断网后除同步外的功能都能用。
    globPatterns: ['**/*.{html,js,css,svg,png,ico,woff2,webmanifest}'],
    // 只有一个入口页面，hash 路由不产生新的导航请求，不需要回退。
    navigateFallback: null,
    cleanupOutdatedCaches: true,
    // 首次安装立即接管当前标签页，不刷新也能离线。
    // 更新仍停在 waiting，直到用户确认，因为没有 skipWaiting。
    clientsClaim: true,
  },
};
