import { currentLanguage } from '@/i18n';

/** 把 ISO 8601 时间按当前界面语言显示为本地时间；无法识别时原样显示。 */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(currentLanguage());
}
