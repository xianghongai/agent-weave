import { ShieldAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';

/* 高危标记的开关与徽标，命令工具、MCP Server、内置工具和规则共用。 */

/** 高危的文字配色，与“拒绝”同属警示色。 */
export const HIGH_RISK_TONE = 'text-destructive';

interface HighRiskSwitchProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** 说明标记后何时产生提示，工具与规则的说法不同。 */
  hint: string;
}

export function HighRiskSwitch({ id, checked, onCheckedChange, hint }: HighRiskSwitchProps) {
  const { t } = useTranslation();

  return (
    <Field orientation="horizontal">
      <Switch id={id} className="mt-0.5" checked={checked} onCheckedChange={onCheckedChange} />
      <FieldContent>
        <FieldLabel htmlFor={id}>{t('notices.highRiskFlag')}</FieldLabel>
        <FieldDescription>{hint}</FieldDescription>
      </FieldContent>
    </Field>
  );
}

/** 列表中被标记为高危的条目旁的徽标。 */
export function HighRiskBadge() {
  const { t } = useTranslation();

  return (
    <Badge variant="outline" className={HIGH_RISK_TONE}>
      <ShieldAlertIcon />
      {t('notices.highRiskFlag')}
    </Badge>
  );
}
