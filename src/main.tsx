import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/index.css';
import { App } from '@/app';
import { isFramed } from '@/browser/frame-guard';
import { setupI18n } from '@/i18n';
import { syncThemeToDocument } from '@/state/theme';

// 恢复上次选择的主题，并在之后随 store 同步。
syncThemeToDocument();

// 被嵌在别的页面中时不渲染界面，诱导点击无处可点。
if (!isFramed()) {
  // 先初始化文案，首次渲染时就能显示界面文字。
  void setupI18n().then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
}
