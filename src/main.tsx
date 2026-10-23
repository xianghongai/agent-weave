import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/index.css';
import { App } from '@/app';
import { setupI18n } from '@/i18n';

// 先初始化文案，首次渲染时就能显示界面文字。
void setupI18n().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
