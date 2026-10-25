import { useTranslation } from 'react-i18next';

import { FieldLabelWithHelp } from '@/components/field-label-with-help';
import { Field, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { TemplatePair } from '@/lib/workspace';

interface TemplatePairFieldsProps {
  idPrefix: string;
  legend: string;
  /** 两个模板各自的说明，按 Markdown 渲染在字段名旁的问号气泡中。 */
  help: { with: string; without: string };
  value: TemplatePair;
  onChange: (value: TemplatePair) => void;
}

/** 一对输出模板：有模式与无模式。命令工具、MCP 工具和内置工具的模板都用它编辑。 */
export function TemplatePairFields({ idPrefix, legend, help, value, onChange }: TemplatePairFieldsProps) {
  const { t } = useTranslation();

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">{legend}</FieldLegend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabelWithHelp
            htmlFor={`${idPrefix}-with`}
            help={{ label: t('agents.withPatternHelp'), content: help.with }}
          >
            {t('agents.withPattern')}
          </FieldLabelWithHelp>
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
          <FieldLabelWithHelp
            htmlFor={`${idPrefix}-without`}
            help={{ label: t('agents.withoutPatternHelp'), content: help.without }}
          >
            {t('agents.withoutPattern')}
          </FieldLabelWithHelp>
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
