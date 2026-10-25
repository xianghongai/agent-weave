import { ShieldIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { GitHubIcon } from '@/components/github-icon';

const REPOSITORY_URL = 'https://github.com/xianghongai/agent-weave';

/** 紧凑的单行页脚，用顶部边框和底色与内容区分开，与页眉呼应。文案放不下时截断，悬停显示全文。 */
export function SiteFooter() {
  const { t } = useTranslation();
  const privacy = t('footer.privacy');
  const repository = t('footer.repository');

  return (
    <footer className="shrink-0 border-t bg-muted/40">
      <div className="page-width flex h-10 items-center gap-2 text-xs text-muted-foreground">
        <ShieldIcon className="size-3.5 shrink-0" />
        <p title={privacy} className="min-w-0 flex-1 truncate">
          {privacy}
        </p>
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={repository}
          title={repository}
          className="-mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <GitHubIcon className="size-4" />
        </a>
      </div>
    </footer>
  );
}
