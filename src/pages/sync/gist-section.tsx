import {
  CircleCheckIcon,
  CircleDashedIcon,
  CloudDownloadIcon,
  CloudUploadIcon,
  CloudIcon,
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
import { gistProblemMessage } from '@/i18n/problems';
import { formatTime } from '@/i18n/format-time';
import {
  type GistConnection,
  type GistContentFailure,
  browserFetch,
  gistSettingsStatus,
  isContentFailure,
  pullWorkspace,
  pushWorkspace,
} from '@/lib/gist';
import type { Workspace } from '@/lib/workspace';
import { GistAuthDialog } from '@/pages/sync/gist-auth-dialog';
import { useAppStore } from '@/state/app-store';
import { useUiStore } from '@/state/ui-store';

/**
 * 已读取远端、等待用户确认的覆盖。
 * 推送时远端内容可能无法使用（如文件缺失），仍可以覆盖；拉取时远端一定是有效的工作区。
 */
type Pending =
  | { kind: 'push'; gistId: string; remote: Workspace | GistContentFailure }
  | { kind: 'pull'; remote: Workspace };

/**
 * 同步页的“Gist 同步”一节：只显示设置的状态，以及认证配置、手动推送和拉取。
 * Token、Gist ID 和 Gist 链接只在认证配置对话框中出现，共享屏幕时不会泄露。
 */
export function GistSection() {
  const { t } = useTranslation();
  const settings = useAppStore((state) => state.gistSettings);
  const setGistSettings = useAppStore((state) => state.setGistSettings);
  const replaceWorkspace = useAppStore((state) => state.replaceWorkspace);
  const workspace = useAppStore((state) => state.workspace);
  const settingsInvalid = useUiStore((state) => Boolean(state.fallback?.gistSettings));
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  // 对话框关闭时保留待确认的内容，避免退场动画期间内容跳变。
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const status = gistSettingsStatus(settings);
  const gistId = status.gist.status === 'linked' ? status.gist.gistId : null;

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

      <ul className="grid gap-1.5 text-sm">
        <StatusItem state={status.token === 'configured' ? 'ok' : 'missing'}>
          {t(`gist.status.token.${status.token}`)}
        </StatusItem>
        <StatusItem state={STATUS_STATE[status.gist.status]}>{t(`gist.status.gist.${status.gist.status}`)}</StatusItem>
      </ul>

      {settingsInvalid && (
        <Note tone="warning" icon={TriangleAlertIcon}>
          {t('gist.invalidStructure')}
        </Note>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setAuthOpen(true)}>
          <KeyRoundIcon />
          {t('gist.auth')}
        </Button>
        <Button variant="outline" disabled={busy || !status.canPush} onClick={() => void startPush()}>
          <CloudUploadIcon />
          {t('gist.push')}
        </Button>
        <Button variant="outline" disabled={busy || !status.canPull} onClick={() => void startPull()}>
          <CloudDownloadIcon />
          {t('gist.pull')}
        </Button>
        {busy && <span className="text-sm text-muted-foreground">{t('gist.working')}</span>}
      </div>

      <GistAuthDialog open={authOpen} onOpenChange={setAuthOpen} />

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

const STATUS_STATE = { linked: 'ok', missing: 'missing', invalid: 'invalid' } as const;

const STATUS_ICON = { ok: CircleCheckIcon, missing: CircleDashedIcon, invalid: TriangleAlertIcon } as const;

/** 状态的一项：已就绪、未填写、无效各用一种图标。 */
function StatusItem({ state, children }: { state: keyof typeof STATUS_ICON; children: React.ReactNode }) {
  const Icon = STATUS_ICON[state];
  return (
    <li className={state === 'missing' ? 'flex items-center gap-2 text-muted-foreground' : 'flex items-center gap-2'}>
      <Icon className={state === 'missing' ? 'size-4 shrink-0' : 'size-4 shrink-0 text-brand'} />
      {children}
    </li>
  );
}
