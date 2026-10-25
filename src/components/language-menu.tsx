import { LanguagesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { switchLanguage, toLanguage } from '@/i18n';
import { LANGUAGE_NAMES } from '@/i18n/language-names';
import { LANGUAGES, type Language } from '@/lib/language';

const ITEMS = LANGUAGES.map((value) => ({ value, label: LANGUAGE_NAMES[value] }));

/** 页脚的语言菜单。每种语言用自己的写法列出，无论当前是什么语言都能找到自己的语言。 */
export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const language = toLanguage(i18n.language);

  // 语言包加载失败时界面和菜单都停在原来的语言。
  const select = (next: Language) => {
    switchLanguage(next).catch(() => toast.error(t('footer.languageLoadFailed')));
  };

  return (
    <Select<Language> items={ITEMS} value={language} onValueChange={(next) => next !== null && select(next)}>
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
