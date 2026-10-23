import { PlusIcon, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Scope } from '@/lib/workspace';

interface ScopeListEditorProps {
  /** 作为输入框 ID 的前缀，同一表单中有多个作用域列表时用来区分。 */
  idPrefix: string;
  legend: string;
  scopes: Scope[];
  onChange: (scopes: Scope[]) => void;
}

/**
 * 编辑一组作用域（名称、路径、可选说明）。权限输出和 MCP 输出各用一个。
 * 新增的空行保存时由工作区操作丢弃，这里不做整理。
 */
export function ScopeListEditor({ idPrefix, legend, scopes, onChange }: ScopeListEditorProps) {
  const { t } = useTranslation();

  function update(index: number, changes: Partial<Scope>) {
    onChange(scopes.map((scope, i) => (i === index ? { ...scope, ...changes } : scope)));
  }

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">{legend}</FieldLegend>
      <FieldDescription>{t('agents.scopesHint')}</FieldDescription>
      {scopes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('agents.noScopes')}</p>
      ) : (
        <ul className="grid gap-3">
          {scopes.map((scope, index) => (
            // 作用域没有 ID，只在末尾新增或按位置删除，用下标作为键即可。
            <li key={index} className="grid gap-2 rounded-lg border p-2.5 sm:grid-cols-[8rem_1fr_auto]">
              <Input
                id={`${idPrefix}-name-${index}`}
                aria-label={t('agents.scopeName')}
                value={scope.name}
                autoComplete="off"
                placeholder={t('agents.scopeNamePlaceholder')}
                onChange={(event) => update(index, { name: event.target.value })}
              />
              <Input
                id={`${idPrefix}-path-${index}`}
                aria-label={t('agents.scopePath')}
                value={scope.path}
                autoComplete="off"
                spellCheck={false}
                placeholder={t('agents.scopePathPlaceholder')}
                className="font-mono"
                onChange={(event) => update(index, { path: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('agents.removeScope')}
                title={t('agents.removeScope')}
                className="justify-self-end sm:row-span-2"
                onClick={() => onChange(scopes.filter((_, i) => i !== index))}
              >
                <XIcon />
              </Button>
              <Input
                id={`${idPrefix}-note-${index}`}
                aria-label={t('agents.scopeNote')}
                value={scope.note}
                autoComplete="off"
                placeholder={`${t('agents.scopeNote')}（${t('common.optional')}）`}
                className="sm:col-span-2"
                onChange={(event) => update(index, { note: event.target.value })}
              />
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...scopes, EMPTY_SCOPE])}>
          <PlusIcon />
          {t('agents.addScope')}
        </Button>
      </div>
    </FieldSet>
  );
}

const EMPTY_SCOPE: Scope = { name: '', path: '', note: '' };
