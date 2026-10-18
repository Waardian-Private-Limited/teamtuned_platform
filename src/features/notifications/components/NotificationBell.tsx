'use client';

import React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { cx } from '@/theme/tokens';
import { enablePush, listenForPush } from '../push/webPush';
import { getNotificationState, loadFresh, markAllRead, onNewNotifications, playChime, refreshCounts, soundAllowed, startLive, useNotificationState } from '../store/notificationStore';
import { NotificationList } from './NotificationList';
import { useOpenNotification } from './useOpenNotification';

function showCard(title?: string, body?: string) {
  toast.custom(
    (t) => (
      <div className={cx('w-80 rounded-2xl border border-line bg-surface p-3 shadow-[var(--tt-shadow-md)] transition-all', t.visible ? 'opacity-100' : 'opacity-0')}>
        <p className="text-sm font-bold text-fg">{title}</p>
        {body && <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{body}</p>}
      </div>
    ),
    { duration: 5000, position: 'top-right' }
  );
}

/**
 * The top bar's bell: a live unread count and a menu with the newest notifications. Mounting it starts the
 * store's refreshing (tab focus, a slow timer, browser push) and turns each new arrival into a quiet toast.
 */
export function NotificationBell({ area }: { area: 'employee' | 'org-admin' }) {
  const s = useNotificationState();
  const [open, setOpen] = React.useState(false);
  const wrapper = React.useRef<HTMLDivElement>(null);
  const openItem = useOpenNotification(() => setOpen(false));

  React.useEffect(() => {
    const stop = startLive();
    // A push shows the browser's own alert when the tab is hidden; with the tab open, a toast, a chime and a recount.
    let unlisten: (() => void) | undefined;
    void enablePush({ ask: false }).then(async () => {
      unlisten = await listenForPush((p) => {
        showCard(p.title, p.body);
        if (soundAllowed()) playChime();
        void refreshCounts({ announce: false });
      });
    }).catch(() => undefined);
    // Something new turned up while polling: show the newest one.
    onNewNotifications(async () => {
      await loadFresh({ silent: true });
      const newest = getNotificationState().fresh[0];
      if (newest) showCard(newest.title, newest.body);
    });
    return () => { stop(); unlisten?.(); onNewNotifications(null); };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    void loadFresh();
    const away = (e: MouseEvent) => { if (!wrapper.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const allPage = `/${area}/notifications`;
  return (
    <div className="relative" ref={wrapper}>
      <button
        type="button"
        aria-label={s.unread ? `Notifications, ${s.unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
      >
        <Bell size={18} />
        {s.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--tt-primary)] px-1 text-[10px] font-bold leading-none text-[var(--tt-on-primary)]">
            {s.unread > 99 ? '99+' : s.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface shadow-[var(--tt-shadow-md)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold text-fg">Notifications</p>
            {s.fresh.length > 0 && <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-fg-muted hover:text-fg">Mark all read</button>}
          </div>
          <div className="max-h-[26rem] overflow-y-auto p-3">
            <NotificationList
              items={s.fresh.slice(0, 8)} loading={s.freshLoading} error={s.freshError} compact
              emptyTitle="You're all caught up" emptyHint="New notifications show up here."
              onOpen={openItem} onRetry={() => void loadFresh()}
            />
          </div>
          <Link href={allPage} onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-xs font-semibold text-fg hover:bg-bg-subtle">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
