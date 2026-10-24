import { InfoIcon, LaptopIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Note } from '@/components/page';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { expandText, isDeviceSettingsComplete } from '@/lib/placeholders';
import { OPERATING_SYSTEMS } from '@/lib/workspace';
import { useAppStore } from '@/state/app-store';
import { useUiStore } from '@/state/ui-store';

/** 界面上展示的路径占位符，按这个顺序列出展开结果。 */
const PLACEHOLDERS = ['{{home}}', '{{user}}'] as const;

/**
 * 同步页的“本机设置”一节：每个操作系统一个 Tab，面板里填该系统的用户名。
 * 选中的 Tab 就是输出时展开路径占位符所用的系统；还没选时没有选中项。修改即保存。
 */
export function DeviceSettingsSection() {
  const { t } = useTranslation();
  const settings = useAppStore((state) => state.deviceSettings);
  const setDeviceSettings = useAppStore((state) => state.setDeviceSettings);
  const settingsInvalid = useUiStore((state) => Boolean(state.fallback?.deviceSettings));
  const tokens = { home: PLACEHOLDERS[0], user: PLACEHOLDERS[1] };

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
        <Tabs
          value={settings.os}
          onValueChange={(next) => {
            // 受控且只接受已知系统；Base UI 自动回退时给出的 `null` 不覆盖已有的选择。
            const os = OPERATING_SYSTEMS.find((candidate) => candidate === next);
            if (os) {
              setDeviceSettings({ ...settings, os });
            }
          }}
        >
          <div className="grid gap-1">
            <TabsList aria-label={t('deviceSettings.os')}>
              {OPERATING_SYSTEMS.map((os) => (
                <TabsTrigger key={os} value={os} className="px-3">
                  {t(`deviceSettings.osNames.${os}`)}
                </TabsTrigger>
              ))}
            </TabsList>
            <p className="text-sm text-muted-foreground text-pretty">{t('deviceSettings.osHint')}</p>
          </div>
          {OPERATING_SYSTEMS.map((os) => {
            const osName = t(`deviceSettings.osNames.${os}`);
            const inputId = `device-user-name-${os}`;
            return (
              <TabsContent key={os} value={os} className="pt-2">
                <Field>
                  <FieldLabel htmlFor={inputId}>{t('deviceSettings.userName', { os: osName })}</FieldLabel>
                  <Input
                    id={inputId}
                    className="max-w-xs font-mono"
                    value={settings.user_names[os]}
                    onChange={(event) =>
                      setDeviceSettings({
                        ...settings,
                        user_names: { ...settings.user_names, [os]: event.target.value },
                      })
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <FieldDescription>
                    {t('deviceSettings.userNameHint', { os: osName, home: t(`deviceSettings.homeExamples.${os}`) })}
                  </FieldDescription>
                </Field>
              </TabsContent>
            );
          })}
        </Tabs>

        {isDeviceSettingsComplete(settings) ? (
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

      {settingsInvalid && (
        <Note tone="warning" icon={TriangleAlertIcon}>
          {t('deviceSettings.invalidStructure')}
        </Note>
      )}
    </section>
  );
}
