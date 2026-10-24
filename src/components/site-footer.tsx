import { ShieldIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** 紧凑的单行页脚，用顶部边框和底色与内容区分开，与页眉呼应。放不下时截断，悬停显示全文。 */
export function SiteFooter() {
  const { t } = useTranslation();
  const privacy = t('footer.privacy');

  return (
    <footer className="shrink-0 border-t bg-muted/40">
      <div className="page-width flex h-10 items-center gap-2 text-xs text-muted-foreground">
        <ShieldIcon className="size-3.5 shrink-0" />
        <p title={privacy} className="truncate">
          {privacy}
        </p>
      </div>
    </footer>
  );
}
