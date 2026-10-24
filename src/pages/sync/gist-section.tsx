import {
  CloudDownloadIcon,
  CloudUploadIcon,
  CloudIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Note } from '@/components/page';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { gistProblemMessage } from '@/i18n/problems';
import { formatTime } from '@/i18n/format-time';
import {
  type GistConnection,
  type GistContentFailure,
  browserFetch,
  isContentFailure,
  parseGistId,
  pullWorkspace,
  pushWorkspace,
} from '@/lib/gist';
import type { Workspace } from '@/lib/workspace';
import { useAppStore } from '@/state/app-store';
import { useUiStore } from '@/state/ui-store';

/** 创建 Token 的页面：经典 Token 预先勾选 `gist`，Fine-grained Token 需要用户自己授予 Gists 读写。 */
const CLASSIC_TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=agent-weave';
const FINE_GRAINED_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

/**
 * 已读取远端、等待用户确认的覆盖。
 * 推送时远端内容可能无法使用（如文件缺失），仍可以覆盖；拉取时远端一定是有效的工作区。
 */
type Pending =
  | { kind: 'push'; gistId: string; remote: Workspace | GistContentFailure }
  | { kind: 'pull'; remote: Workspace };

/** 同步页的“Gist 同步”一节：Token 指引、本机 Gist 设置，以及手动推送和拉取。 */
export function GistSection() {
  const { t } = useTranslation();
  const settings = useAppStore((state) => state.gistSettings);
  const setGistSettings = useAppStore((state) => state.setGistSettings);
  const replaceWorkspace = useAppStore((state) => state.replaceWorkspace);
  const workspace = useAppStore((state) => state.workspace);
  const settingsInvalid = useUiStore((state) => state.fallback?.gistSettings ?? false);
  const [busy, setBusy] = useState(false);
  // 对话框关闭时保留待确认的内容，避免退场动画期间内容跳变。
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const hasToken = settings.token.trim() !== '';
  const gistIdInput = settings.gist_id.trim();
  const gistId = gistIdInput === '' ? null : parseGistId(gistIdInput);
  const gistIdInvalid = gistIdInput !== '' && gistId === null;

  function connection(): GistConnection {
    return { fetch: browserFetch, token: settings.token };
  }

  /** 推送前先读取远端，展示双方的修改时间；还没有 Gist 时直接创建。 */
  async function startPush() {
    if (gistId === null) {
      await push(null);
      return;
    }
    setBusy(true);
    const result = await pullWorkspace(connection(), gistId);
    setBusy(false);
    if ('workspace' in result) {
      openConfirm({ kind: 'push', gistId, remote: result.workspace });
    } else if (isContentFailure(result)) {
      openConfirm({ kind: 'push', gistId, remote: result });
    } else {
      toast.error(t('gist.pushFailed'), { description: gistProblemMessage(t, result) });
    }
  }

  async function push(id: string | null) {
    setBusy(true);
    const result = await pushWorkspace(connection(), id, useAppStore.getState().workspace, t('gist.description'));
    setBusy(false);
    if ('problem' in result) {
      toast.error(t('gist.pushFailed'), { description: gistProblemMessage(t, result) });
      return;
    }
    if (id === null) {
      // 请求期间设置可能被修改，以最新的设置为准。
      setGistSettings({ ...useAppStore.getState().gistSettings, gist_id: result.gistId });
      toast.success(t('gist.created'));
    } else {
      toast.success(t('gist.pushed'));
    }
  }

  async function startPull() {
    if (gistId === null) {
      return;
    }
    setBusy(true);
    const result = await pullWorkspace(connection(), gistId);
    setBusy(false);
    if ('problem' in result) {
      toast.error(t('gist.pullFailed'), { description: gistProblemMessage(t, result) });
      return;
    }
    openConfirm({ kind: 'pull', remote: result.workspace });
  }

  function openConfirm(next: Pending) {
    setPending(next);
    setConfirmOpen(true);
  }

  function confirm() {
    setConfirmOpen(false);
    if (pending?.kind === 'push') {
      void push(pending.gistId);
    } else if (pending?.kind === 'pull') {
      replaceWorkspace(pending.remote);
      toast.success(t('gist.pulled'));
    }
  }

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h2 className="flex items-center gap-2 font-medium">
          <CloudIcon className="size-4 text-brand" />
          {t('gist.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('gist.hint')}</p>
      </div>

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
            value={settings.token}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            onChange={(event) => setGistSettings({ ...settings, token: event.target.value })}
          />
          <FieldDescription>{t('gist.tokenHint')}</FieldDescription>
        </Field>
        <Field data-invalid={gistIdInvalid ? true : undefined}>
          <FieldLabel htmlFor="gist-id">{t('gist.gistId')}</FieldLabel>
          <Input
            id="gist-id"
            value={settings.gist_id}
            autoComplete="off"
            spellCheck={false}
            placeholder={t('gist.gistIdPlaceholder')}
            aria-invalid={gistIdInvalid ? true : undefined}
            className="font-mono"
            onChange={(event) => setGistSettings({ ...settings, gist_id: event.target.value })}
          />
          {gistIdInvalid ? (
            <FieldError>{t('gist.gistIdInvalid')}</FieldError>
          ) : (
            <FieldDescription>
              {t('gist.gistIdHint')}
              {gistId !== null && (
                <>
                  {' '}
                  <ExternalLink href={`https://gist.github.com/${gistId}`}>{t('gist.openGist')}</ExternalLink>
                </>
              )}
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      {settingsInvalid && (
        <Note tone="warning" icon={TriangleAlertIcon}>
          {t('gist.invalidStructure')}
        </Note>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={busy || !hasToken || gistIdInvalid} onClick={() => void startPush()}>
          <CloudUploadIcon />
          {t('gist.push')}
        </Button>
        <Button variant="outline" disabled={busy || gistId === null} onClick={() => void startPull()}>
          <CloudDownloadIcon />
          {t('gist.pull')}
        </Button>
        {busy && <span className="text-sm text-muted-foreground">{t('gist.working')}</span>}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(pending?.kind === 'pull' ? 'gist.confirmPullTitle' : 'gist.confirmPushTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(pending?.kind === 'pull' ? 'gist.confirmPullDescription' : 'gist.confirmPushDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pending && <Comparison pending={pending} local={workspace} />}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirm}>
              {t(pending?.kind === 'pull' ? 'gist.confirmPull' : 'gist.confirmPush')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** 并列展示远端与本地的修改时间；将被覆盖的一方较新时给出提醒。 */
function Comparison({ pending, local }: { pending: Pending; local: Workspace }) {
  const { t } = useTranslation();
  const { remote } = pending;
  const readable = !('problem' in remote);
  const remoteText = readable
    ? formatTime(remote.updated_at)
    : t('gist.remoteUnreadable', { reason: gistProblemMessage(t, remote) });
  const order = readable ? compareTime(remote.updated_at, local.updated_at) : 0;
  const warning =
    pending.kind === 'push' && order > 0
      ? 'gist.remoteNewer'
      : pending.kind === 'pull' && order < 0
        ? 'gist.localNewer'
        : null;

  return (
    <div className="grid gap-2 text-sm">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border p-3">
        <dt className="text-muted-foreground">{t('gist.remote')}</dt>
        <dd>{remoteText}</dd>
        <dt className="text-muted-foreground">{t('gist.local')}</dt>
        <dd>{formatTime(local.updated_at)}</dd>
      </dl>
      {warning && (
        <Note tone="warning" icon={TriangleAlertIcon}>
          {t(warning)}
        </Note>
      )}
    </div>
  );
}

/** 比较两个 ISO 8601 时间：前者较新时为正数；无法识别时视为相同。 */
function compareTime(a: string, b: string): number {
  const diff = Date.parse(a) - Date.parse(b);
  return Number.isNaN(diff) ? 0 : diff;
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
