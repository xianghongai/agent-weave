import { ExternalLinkIcon, KeyRoundIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormDialog } from '@/components/form-dialog';
import { Note } from '@/components/page';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { gistSettingsStatus } from '@/lib/gist';
import { useAppStore } from '@/state/app-store';

/** 创建 Token 的页面：经典 Token 预先勾选 `gist`，Fine-grained Token 预先填好名称并申请 Gists 读写。 */
const CLASSIC_TOKEN_URL = 'https://github.com/settings/tokens/new?description=agent-weave&scopes=gist';
const FINE_GRAINED_TOKEN_URL =
  'https://github.com/settings/personal-access-tokens/new?name=agent-weave&description=agent-weave&gists=write';

interface GistAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Gist 认证配置：Token 指引、Token 和 Gist ID。
 * 认证信息只在这里出现，同步页上只显示状态，开会共享屏幕时不会泄露。
 */
export function GistAuthDialog({ open, onOpenChange }: GistAuthDialogProps) {
  const { t } = useTranslation();

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="narrow" title={t('gist.authTitle')}>
      {/* 每次打开都以当前设置重新初始化草稿。 */}
      {open && <GistAuthForm onDone={() => onOpenChange(false)} />}
    </FormDialog>
  );
}

/** 编辑草稿，点“保存”才写入 store；Gist ID 无效时不能保存。 */
function GistAuthForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => useAppStore.getState().gistSettings);
  const { gist } = gistSettingsStatus(draft);
  const gistIdInvalid = gist.status === 'invalid';

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (gistIdInvalid) {
      return;
    }
    useAppStore.getState().setGistSettings({ token: draft.token.trim(), gist_id: draft.gist_id.trim() });
    onDone();
  }

  return (
    <form onSubmit={save} className="grid gap-4">
      <Note icon={KeyRoundIcon}>
        <p>{t('gist.tokenGuide')}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <ExternalLink href={CLASSIC_TOKEN_URL}>{t('gist.createClassicToken')}</ExternalLink>
          <ExternalLink href={FINE_GRAINED_TOKEN_URL}>{t('gist.createFineGrainedToken')}</ExternalLink>
        </p>
        <p>{t('gist.localOnly')}</p>
      </Note>
      <Note tone="warning" icon={TriangleAlertIcon}>
        {t('gist.secretWarning')}
      </Note>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="gist-token">{t('gist.token')}</FieldLabel>
          <Input
            id="gist-token"
            type="password"
            value={draft.token}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            onChange={(event) => setDraft({ ...draft, token: event.target.value })}
          />
          <FieldDescription>{t('gist.tokenHint')}</FieldDescription>
        </Field>
        <Field data-invalid={gistIdInvalid ? true : undefined}>
          <FieldLabel htmlFor="gist-id">{t('gist.gistId')}</FieldLabel>
          <Input
            id="gist-id"
            value={draft.gist_id}
            autoComplete="off"
            spellCheck={false}
            placeholder={t('gist.gistIdPlaceholder')}
            aria-invalid={gistIdInvalid ? true : undefined}
            className="font-mono"
            onChange={(event) => setDraft({ ...draft, gist_id: event.target.value })}
          />
          {gistIdInvalid ? (
            <FieldError>{t('gist.gistIdInvalid')}</FieldError>
          ) : (
            <FieldDescription>
              {t('gist.gistIdHint')}
              {gist.status === 'linked' && (
                <>
                  {' '}
                  <ExternalLink href={`https://gist.github.com/${gist.gistId}`}>{t('gist.openGist')}</ExternalLink>
                </>
              )}
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={gistIdInvalid}>
          {t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-brand underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLinkIcon className="size-3.5" />
    </a>
  );
}
