import { ArrowRightIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { buttonVariants } from '@/components/ui/button';
import { pageById } from '@/pages/registry';

/** 首页展示的四项特性，各自进入对应的页面；图标和路径取自登记的页面。 */
const FEATURES = ['tools', 'mcp', 'rules', 'output'] as const;

/** 进场动效：标语、介绍、卡片、按钮依次浮现。 */
function fadeIn(order: number) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: order * 0.06, ease: 'easeOut' },
  } as const;
}

/** 宣传首页：站点的默认入口，不在导航中登记。宽屏下内容在主区域内居中，一屏放下；窄屏随整页滚动。 */
export default function HomePage() {
  const { t } = useTranslation();
  const rules = pageById('rules');

  return (
    // 宽屏下两侧伸进页面的水平内边距，滚动容器不会裁掉卡片描边和焦点环。
    <div className="flex flex-col md:-mx-3 md:min-h-0 md:flex-1 md:overflow-y-auto md:px-3">
      {/* 内容从顶部排起，不随视口高度做垂直居中；上留白比下方多一些，让标语离开页眉。 */}
      <div className="pt-16 pb-12 md:pt-24 md:pb-10">
        <section className="max-w-3xl">
          <motion.h1 {...fadeIn(0)} className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {/* 前后两半各自不折行，窄屏下在逗号处换行。 */}
            <span className="inline-block">{t('home.headline.lead')}</span>
            <span className="inline-block">{t('home.headline.tail')}</span>
          </motion.h1>
          <motion.p {...fadeIn(1)} className="mt-4 text-pretty text-muted-foreground sm:text-lg">
            {t('home.intro')}
          </motion.p>
        </section>

        <ol aria-label={t('home.features')} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((id, index) => {
            const { path, icon: Icon } = pageById(id);
            return (
              <motion.li key={id} {...fadeIn(index + 2)}>
                <Link
                  href={path}
                  className="group flex h-full flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-[box-shadow,background-color] hover:ring-brand/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="size-5" />
                  </span>
                  <span className="grid gap-1.5">
                    <span className="flex items-center gap-1.5 font-medium">
                      {t(`home.${id}.title`)}
                      <ArrowRightIcon className="size-4 -translate-x-1 opacity-0 transition-[translate,opacity] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100" />
                    </span>
                    <span className="text-sm text-pretty text-muted-foreground">{t(`home.${id}.summary`)}</span>
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ol>

        <motion.div {...fadeIn(FEATURES.length + 2)} className="mt-10">
          {/* 跳转用链接而不是按钮，渲染出的元素保留链接语义。 */}
          <Link href={rules.path} className={buttonVariants({ size: 'lg', className: 'h-10 px-4' })}>
            {t('home.start')}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
