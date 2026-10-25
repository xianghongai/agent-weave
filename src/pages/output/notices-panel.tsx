import { CircleCheckIcon, CircleSlashIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Note } from '@/components/page';
import { skipReasonMessage } from '@/i18n/problems';
import type { SkippedRule } from '@/lib/generate';
import type { Notice } from '@/lib/notices';
import type { Workspace } from '@/lib/workspace';
import { NoticeSection } from '@/pages/output/notice-section';
import { PlaceholderNotice } from '@/pages/output/placeholder-notice';
import { RuleLine, RuleNoticeList } from '@/pages/output/rule-notice-list';

interface NoticesPanelProps {
  workspace: Workspace;
  notices: Notice[];
  skippedRules: SkippedRule[];
}

/**
 * “重要提示”Tab 的内容：依次列出高危提示、冲突提示、跳过的规则、TOML 跳过的字段、占位符未展开。
 * 每一类没有时不显示该节；一条都没有时显示“没有提示”。
 */
export function NoticesPanel({ workspace, notices, skippedRules }: NoticesPanelProps) {
  const { t } = useTranslation();
  if (notices.length === 0 && skippedRules.length === 0) {
    return <Note icon={CircleCheckIcon}>{t('output.noNotices')}</Note>;
  }

  return (
    <div className="grid gap-6">
      <RuleNoticeList workspace={workspace} notices={notices} />
      <SkippedRuleList workspace={workspace} skippedRules={skippedRules} />
      <TomlSkippedFieldList workspace={workspace} notices={notices} />
      <PlaceholderNotice notices={notices} />
    </div>
  );
}

/** 跳过的规则：该 Agent 定义表达不了的规则，附带原因。没有时不显示。 */
function SkippedRuleList({ workspace, skippedRules }: { workspace: Workspace; skippedRules: SkippedRule[] }) {
  const { t } = useTranslation();
  if (skippedRules.length === 0) {
    return null;
  }

  return (
    <NoticeSection
      icon={CircleSlashIcon}
      title={t('output.skippedRules')}
      count={skippedRules.length}
      hint={t('output.skippedRulesHint')}
    >
      <ul className="divide-y rounded-xl border">
        {skippedRules.map(({ ruleId, reason }) => {
          const rule = workspace.rules.find((candidate) => candidate.id === ruleId);
          if (!rule) {
            return null;
          }
          return (
            <li key={ruleId} className="px-3 py-2">
              <RuleLine workspace={workspace} rule={rule} detail={skipReasonMessage(t, reason, rule)} />
            </li>
          );
        })}
      </ul>
    </NoticeSection>
  );
}

/** TOML 表达不了而被跳过的字段，按 Server 标识与字段路径列出。没有时不显示。 */
function TomlSkippedFieldList({ workspace, notices }: { workspace: Workspace; notices: Notice[] }) {
  const { t } = useTranslation();
  const fields = notices.flatMap((notice) => {
    if (notice.type !== 'tomlFieldSkipped') {
      return [];
    }
    const server = workspace.mcp_servers.find((candidate) => candidate.id === notice.serverId);
    return server ? [{ id: `${notice.serverId}:${notice.field}`, server: server.key, field: notice.field }] : [];
  });
  if (fields.length === 0) {
    return null;
  }

  return (
    <NoticeSection
      icon={CircleSlashIcon}
      title={t('output.tomlFieldSkipped')}
      count={fields.length}
      hint={t('output.tomlFieldSkippedHint')}
    >
      <ul className="divide-y rounded-xl border">
        {fields.map(({ id, server, field }) => (
          <li key={id} className="px-3 py-2 text-sm">
            <code className="font-mono break-all">
              {server} · {field}
            </code>
          </li>
        ))}
      </ul>
    </NoticeSection>
  );
}
