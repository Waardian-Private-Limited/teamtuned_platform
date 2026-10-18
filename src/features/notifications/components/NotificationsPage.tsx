'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { loadFresh, loadHistory, loadMoreHistory, markAllRead, refreshAll, setCategory, useNotificationState } from '../store/notificationStore';
import { CATEGORIES, CATEGORY_LABEL } from '../types';
import { NotificationList } from './NotificationList';
import { PreferencesPanel } from './PreferencesPanel';
import { useOpenNotification } from './useOpenNotification';

type Tab = 'new' | 'history' | 'settings';

/** The full inbox: New and History with category filters, plus settings. */
export function NotificationsPage() {
  const s = useNotificationState();
  const [tab, setTab] = React.useState<Tab>('new');
  const open = useOpenNotification();

  React.useEffect(() => { void refreshAll(); }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'new', label: s.unread > 0 ? `New (${s.unread > 99 ? '99+' : s.unread})` : 'New' },
    { key: 'history', label: 'History' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line bg-bg-subtle p-0.5">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cx('rounded-md px-3 py-1.5 text-xs font-semibold', tab === t.key ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted')}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'new' && s.fresh.length > 0 && (
          <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-fg-muted hover:text-fg">Mark all read</button>
        )}
      </div>

      {tab !== 'settings' && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={s.category === null} onClick={() => void setCategory(null)}>All</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={s.category === c} onClick={() => void setCategory(c)}>
              {CATEGORY_LABEL[c]}{s.byCategory[c] ? ` · ${s.byCategory[c]}` : ''}
            </Chip>
          ))}
        </div>
      )}

      {tab === 'new' && (
        <NotificationList
          items={s.fresh} loading={s.freshLoading} error={s.freshError}
          emptyTitle="You're all caught up" emptyHint="New notifications show up here."
          onOpen={open} onRetry={() => void loadFresh()}
        />
      )}
      {tab === 'history' && (
        <NotificationList
          items={s.history} loading={s.historyLoading} error={s.historyError}
          emptyTitle="Nothing here yet" emptyHint="Notifications you have read are kept here."
          onOpen={open} onRetry={() => void loadHistory()}
          onLoadMore={s.historyNext !== null ? () => void loadMoreHistory() : undefined} loadingMore={s.historyMore}
        />
      )}
      {tab === 'settings' && <PreferencesPanel />}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors', active ? 'border-transparent bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg-muted hover:text-fg')}
    >
      {children}
    </button>
  );
}
