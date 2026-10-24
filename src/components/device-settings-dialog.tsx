import { InfoIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormDialog } from '@/components/form-dialog';
import { Markdown } from '@/components/markdown';
import { MarkdownFieldDescription } from '@/components/markdown-field-description';
import { Note } from '@/components/page';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { expandText, isDeviceSettingsComplete } from '@/lib/placeholders';
import { type DeviceSettings, OPERATING_SYSTEMS } from '@/lib/workspace';
import { useAppStore } from '@/state/app-store';
import { useUiStore } from '@/state/ui-store';

/** 界面上展示的路径占位符，按这个顺序列出展开结果。 */
const PLACEHOLDERS = ['{{home}}', '{{user}}'] as const;

/** 本机设置对话框，挂在应用外壳上，由 `ui-store` 的 `openDialog` 控制开关。 */
export function DeviceSettingsDialog() {
  const { t } = useTranslation();
  const open = useUiStore((state) => state.openDialog === 'deviceSettings');
  const closeDialog = useUiStore((state) => state.closeDialog);

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          closeDialog();
        }
      }}
      size="narrow"
      title={t('deviceSettings.title')}
    >
      {/* 每次打开都以当前设置重新初始化草稿。 */}
      {open && <DeviceSettingsForm onDone={closeDialog} />}
    </FormDialog>
  );
}

/**
 * 每个操作系统一个 Tab，面板里填该系统的用户名；选中的 Tab 就是输出时展开路径占位符所用的系统。
 * 修改的是草稿，点“保存”才写入 store，取消或关闭时放弃。
 */
function DeviceSettingsForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  // 还没有选择操作系统时默认选中 Linux，保存后才写入。
  const [draft, setDraft] = useState<DeviceSettings>(() => {
    const settings = useAppStore.getState().deviceSettings;
    return { ...settings, os: settings.os ?? 'linux' };
  });
  const settingsInvalid = useUiStore((state) => Boolean(state.fallback?.deviceSettings));
  const tokens = { home: PLACEHOLDERS[0], user: PLACEHOLDERS[1] };

  function save(event: React.FormEvent) {
    event.preventDefault();
    useAppStore.getState().setDeviceSettings(draft);
    onDone();
  }

  return (
    <form onSubmit={save} className="grid gap-4">
      <Markdown className="text-sm text-muted-foreground text-pretty">{t('deviceSettings.hint', tokens)}</Markdown>

      <Tabs
        value={draft.os}
        onValueChange={(next) => {
          // 受控且只接受已知系统；Base UI 自动回退时给出的 `null` 不覆盖已有的选择。
          const os = OPERATING_SYSTEMS.find((candidate) => candidate === next);
          if (os) {
            setDraft({ ...draft, os });
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
                  value={draft.user_names[os]}
                  onChange={(event) =>
                    setDraft({ ...draft, user_names: { ...draft.user_names, [os]: event.target.value } })
                  }
                  autoComplete="off"
                  spellCheck={false}
                />
                <MarkdownFieldDescription>
                  {t('deviceSettings.userNameHint', { os: osName, home: t(`deviceSettings.homeExamples.${os}`) })}
                </MarkdownFieldDescription>
              </Field>
            </TabsContent>
          );
        })}
      </Tabs>

      {isDeviceSettingsComplete(draft) ? (
        <ul className="grid gap-1 rounded-lg bg-muted p-3 text-sm">
          {PLACEHOLDERS.map((placeholder) => (
            <li key={placeholder} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-muted-foreground">{t('deviceSettings.expandsTo', { placeholder })}</span>
              <code className="font-mono break-all">{expandText(placeholder, draft).value}</code>
            </li>
          ))}
        </ul>
      ) : (
        <Note icon={InfoIcon}>{t('deviceSettings.incomplete')}</Note>
      )}

      <Note icon={InfoIcon}>
        <Markdown>{t('deviceSettings.claudePathHint', tokens)}</Markdown>
      </Note>

      {settingsInvalid && (
        <Note tone="warning" icon={TriangleAlertIcon}>
          {t('deviceSettings.invalidStructure')}
        </Note>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('common.save')}</Button>
      </DialogFooter>
    </form>
  );
}
