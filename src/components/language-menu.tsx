import { LanguagesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { currentLanguage, switchLanguage } from '@/i18n';
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '@/lib/language';

const ITEMS = LANGUAGES.map((value) => ({ value, label: LANGUAGE_NAMES[value] }));

/** 页脚的语言菜单。每种语言用自己的写法列出，无论当前是什么语言都能找到自己的语言。 */
export function LanguageMenu() {
  // 语言切换后，这个 Hook 让菜单重新渲染。
  const { t } = useTranslation();
  const language = currentLanguage();

  return (
    <Select<Language>
      items={ITEMS}
      value={language}
      onValueChange={(next) => next !== null && void switchLanguage(next)}
    >
      <SelectTrigger
        size="sm"
        aria-label={t('footer.language')}
        className="shrink-0 gap-1.5 border-none bg-transparent px-1.5 text-xs text-muted-foreground shadow-none hover:bg-muted hover:text-foreground dark:bg-transparent dark:hover:bg-muted"
      >
        <LanguagesIcon className="size-3.5" />
        <span>{LANGUAGE_NAMES[language]}</span>
      </SelectTrigger>
      <SelectContent side="top" align="end" alignItemWithTrigger={false}>
        {ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value} lang={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
