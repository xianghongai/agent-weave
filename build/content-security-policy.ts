import type { Plugin } from 'vite';

/**
 * 站点的隐私边界，由浏览器强制执行。
 * 脚本、样式、字体只从本站加载，不引用 CDN。
 * 网络请求只放行本站和 GitHub API：Gist 同步是运行时唯一的对外请求。
 * GitHub Pages 不能设置响应头，所以策略以 <meta> 标签发布，`frame-ancestors` 和上报在这种方式下不可用。
 * 内联样式保持放行，因为 React 的 style 属性和界面库会用到。
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "connect-src 'self' https://api.github.com",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** 只给构建产物注入策略：开发服务器的热更新依赖内联脚本。 */
export function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}
