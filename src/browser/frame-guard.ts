/**
 * 页面是否被嵌在别的页面的 iframe 中。
 * GitHub Pages 不能设置响应头，`<meta>` 中的 CSP 不支持 `frame-ancestors`，只能在脚本中检查，防止点击劫持。
 */
export function isFramed(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    // 跨源访问 `window.top` 被拒绝时，同样说明处在别的页面中。
    return true;
  }
}
