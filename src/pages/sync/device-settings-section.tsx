import { InfoIcon, LaptopIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Note } from '@/components/page';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { persistenceProblemMessage } from '@/i18n/problems';
import { expandText } from '@/lib/placeholders';
import { OPERATING_SYSTEMS } from '@/lib/workspace';
import { setDeviceSettings, useDeviceSettings, useDeviceSettingsProblem } from '@/state/device-settings-store';

/** 界面上展示的路径占位符，按这个顺序列出展开结果。 */
const PLACEHOLDERS = ['{{home}}', '{{user}}'] as const;

/** 同步页的“本机设置”一节：选择操作系统、填写用户名，用于输出时展开路径占位符。修改即保存。 */
export function DeviceSettingsSection() {
  const { t } = useTranslation();
  const settings = useDeviceSettings();
  const problem = useDeviceSettingsProblem();
  const tokens = { home: PLACEHOLDERS[0], user: PLACEHOLDERS[1] };
  const complete = settings.os !== null && settings.user_name.trim() !== '';

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h2 className="flex items-center gap-2 font-medium">
          <LaptopIcon className="size-4 text-brand" />
          {t('deviceSettings.title')}
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">{t('deviceSettings.hint', tokens)}</p>
      </div>

      <div className="grid gap-4 rounded-xl border p-3">
        <FieldGroup>
          <Field>
            <FieldLabel>{t('deviceSettings.os')}</FieldLabel>
            <ToggleGroup
              variant="outline"
              value={settings.os ? [settings.os] : []}
              onValueChange={(next) => {
                // 单选；再次点击当前项会得到空数组，此时保持原来的选择。
                const os = OPERATING_SYSTEMS.find((candidate) => next.includes(candidate));
                if (os) {
                  setDeviceSettings({ ...settings, os });
                }
              }}
              aria-label={t('deviceSettings.os')}
            >
              {OPERATING_SYSTEMS.map((os) => (
                <ToggleGroupItem key={os} value={os}>
                  {t(`deviceSettings.osNames.${os}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="device-user-name">{t('deviceSettings.userName')}</FieldLabel>
            <Input
              id="device-user-name"
              className="max-w-xs font-mono"
              value={settings.user_name}
              onChange={(event) => setDeviceSettings({ ...settings, user_name: event.target.value })}
              autoComplete="off"
              spellCheck={false}
            />
            <FieldDescription>{t('deviceSettings.userNameHint')}</FieldDescription>
          </Field>
        </FieldGroup>

        {complete ? (
          <ul className="grid gap-1 rounded-lg bg-muted p-3 text-sm">
            {PLACEHOLDERS.map((placeholder) => (
              <li key={placeholder} className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-muted-foreground">{t('deviceSettings.expandsTo', { placeholder })}</span>
                <code className="font-mono break-all">{expandText(placeholder, settings).value}</code>
              </li>
            ))}
          </ul>
        ) : (
          <Note icon={InfoIcon}>{t('deviceSettings.incomplete')}</Note>
        )}
      </div>

      <Note icon={InfoIcon}>{t('deviceSettings.claudePathHint', tokens)}</Note>

      {problem && (
        <Note tone="warning" icon={TriangleAlertIcon}>
          {problem === 'invalidStructure' ? (
            <p>{t('deviceSettings.invalidStructure')}</p>
          ) : (
            <>
              <p>{persistenceProblemMessage(t, problem)}</p>
              <p>{t('deviceSettings.unsaved')}</p>
            </>
          )}
        </Note>
      )}
    </section>
  );
}
