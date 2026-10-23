import { useTranslation } from 'react-i18next';

import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { TemplatePair } from '@/lib/workspace';

interface TemplatePairFieldsProps {
  idPrefix: string;
  legend: string;
  hint: string;
  value: TemplatePair;
  onChange: (value: TemplatePair) => void;
}

/** 一对输出模板：有模式与无模式。命令工具、MCP 工具和内置工具的模板都用它编辑。 */
export function TemplatePairFields({ idPrefix, legend, hint, value, onChange }: TemplatePairFieldsProps) {
  const { t } = useTranslation();

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">{legend}</FieldLegend>
      <FieldDescription>
        {hint}
        {t('agents.templatesEmptyHint')}
      </FieldDescription>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-with`}>{t('agents.withPattern')}</FieldLabel>
          <Input
            id={`${idPrefix}-with`}
            value={value.with_pattern}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            onChange={(event) => onChange({ ...value, with_pattern: event.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-without`}>{t('agents.withoutPattern')}</FieldLabel>
          <Input
            id={`${idPrefix}-without`}
            value={value.without_pattern}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            onChange={(event) => onChange({ ...value, without_pattern: event.target.value })}
          />
        </Field>
      </div>
    </FieldSet>
  );
}
