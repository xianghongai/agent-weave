import { ShieldAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type HighRisk, NOT_HIGH_RISK } from '@/lib/workspace';

/* 高危标记的开关与徽标，命令工具、MCP Server、内置工具和规则共用。 */

/** 高危的文字配色，与“拒绝”同属警示色。 */
export const HIGH_RISK_TONE = 'text-destructive';

/** 表单的初始高危标记与说明：编辑时取条目上的，新增时不高危。 */
export function initialHighRisk(entry: HighRisk | null): HighRisk {
  return entry ? { high_risk: entry.high_risk, high_risk_reason: entry.high_risk_reason } : NOT_HIGH_RISK;
}

interface HighRiskSwitchProps {
  id: string;
  value: HighRisk;
  onChange: (value: HighRisk) => void;
  /** 说明标记后何时产生提示，工具与规则的说法不同。 */
  hint: string;
}

/** 高危开关；打开后多出一个可选的高危说明输入框。 */
export function HighRiskSwitch({ id, value, onChange, hint }: HighRiskSwitchProps) {
  const { t } = useTranslation();

  return (
    <Field orientation="horizontal">
      <Switch
        id={id}
        className="mt-0.5"
        checked={value.high_risk}
        onCheckedChange={(checked) => onChange({ ...value, high_risk: checked })}
      />
      <FieldContent>
        <FieldLabel htmlFor={id}>{t('notices.highRiskFlag')}</FieldLabel>
        <FieldDescription>{hint}</FieldDescription>
        {value.high_risk && (
          <Input
            value={value.high_risk_reason}
            autoComplete="off"
            aria-label={t('notices.highRiskReason')}
            placeholder={t('notices.highRiskReasonPlaceholder')}
            className="mt-1"
            onChange={(event) => onChange({ ...value, high_risk_reason: event.target.value })}
          />
        )}
      </FieldContent>
    </Field>
  );
}

/** 悬停时显示高危说明的提示框；没有说明时只渲染内容本身。 */
export function HighRiskTooltip({ reasons, children }: { reasons: readonly string[]; children: React.ReactElement }) {
  if (reasons.length === 0) {
    return children;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent className="grid gap-0.5">
        {reasons.map((reason, index) => (
          // 规则与工具的说明可能相同，用序号作 key。
          <p key={index}>{reason}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

/** 列表中被标记为高危的条目旁的徽标，悬停显示高危说明。 */
export function HighRiskBadge({ reason }: { reason: string }) {
  const { t } = useTranslation();

  return (
    <HighRiskTooltip reasons={reason ? [reason] : []}>
      <Badge variant="outline" className={HIGH_RISK_TONE} tabIndex={reason ? 0 : undefined}>
        <ShieldAlertIcon />
        {t('notices.highRiskFlag')}
      </Badge>
    </HighRiskTooltip>
  );
}
