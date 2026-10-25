import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PWA_OPTIONS } from '../build/pwa';

describe('Service Worker 的缓存范围', () => {
  const workbox = PWA_OPTIONS.workbox ?? {};

  it('只预缓存站点文件，不做运行时缓存', () => {
    expect(workbox.runtimeCaching).toBeUndefined();
  });

  it('预缓存覆盖页面、脚本、样式、图标和字体，离线时站点完整可用', () => {
    expect(workbox.globPatterns).toEqual(['**/*.{html,js,css,svg,png,ico,woff2,webmanifest}']);
  });

  it('新版本等待用户确认，不自动接管页面', () => {
    expect(PWA_OPTIONS.registerType).toBe('prompt');
    expect(workbox.skipWaiting).not.toBe(true);
  });
});

describe('站点 manifest', () => {
  const manifest = PWA_OPTIONS.manifest || {};

  it('从站点所在目录启动，部署在子路径下也能安装', () => {
    expect({ start_url: manifest.start_url, scope: manifest.scope }).toEqual({ start_url: './', scope: './' });
  });

  it('声明的图标都在 public/ 中，并包含可遮罩图标', () => {
    const icons = manifest.icons ?? [];
    for (const { src } of icons) {
      const exists = existsSync(fileURLToPath(new URL(`../public/${src}`, import.meta.url)));
      expect({ src, exists }).toEqual({ src, exists: true });
    }
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });
});
