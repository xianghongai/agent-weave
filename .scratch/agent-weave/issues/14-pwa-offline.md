# 14: PWA 离线与更新确认

**What to build:** 站点可以安装为 PWA，除 Gist 同步外，其他功能都能离线使用。站点发布新版本后，页面提示有更新，由用户确认后再刷新，不打断正在进行的编辑。

做法沿用 `hongzhao`：Service Worker 只预缓存站点文件，不做运行时缓存，也不缓存用户数据。

**Blocked by:** 01

**Status:** done

- [ ] 使用 `vite-plugin-pwa` 只预缓存构建产物；不添加运行时缓存或后台同步
- [ ] 提供 manifest 和站点图标
- [ ] 有新版本时显示提示，确认后才刷新
- [ ] 断网后重新打开站点，除同步外的功能都正常
- [ ] CSP 与 Service Worker 共存，不放宽 `connect-src`
