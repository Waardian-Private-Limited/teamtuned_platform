'use client';

import React from 'react';
import { Bell, Cake, CalendarDays, CheckCheck, FileText, Gift, Landmark, ListChecks, MapPin, Palmtree, Users, Wallet, Briefcase, Timer } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { NotificationCategory, NotificationItemDto } from '../types';

const ICONS: Record<NotificationCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  approvals: CheckCheck,
  leave: Palmtree,
  attendance: CalendarDays,
  compoff: Timer,
  holiday: Gift,
  advance: Landmark,
  expense: FileText,
  wallet: Wallet,
  celebration: Cake,
  roster: ListChecks,
  meeting: Users,
  recruitment: Briefcase,
  tracking: MapPin,
  general: Bell,
};

export function age(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

/** One notification: icon, words, age, an unread dot, and "Handled" once somebody else acted on it. */
export function NotificationCard({ item, onOpen, compact = false }: { item: NotificationItemDto; onOpen: (item: NotificationItemDto) => void; compact?: boolean }) {
  const Icon = ICONS[item.category] ?? Bell;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cx(
        'group flex w-full items-start gap-3 rounded-2xl border border-line text-left transition-colors hover:bg-bg-subtle',
        compact ? 'p-3' : 'p-4',
        item.read ? 'bg-surface' : 'bg-bg-subtle'
      )}
    >
      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', item.read ? 'bg-bg-subtle text-fg-muted' : 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]')}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cx('text-sm text-fg', item.read ? 'font-medium' : 'font-bold')}>{item.title}</span>
          <span className="shrink-0 text-xs text-fg-muted">{age(item.created_at)}</span>
        </span>
        {item.body && <span className="mt-0.5 line-clamp-2 block text-xs text-fg-muted">{item.body}</span>}
        {item.resolved && <span className="mt-1.5 inline-block rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-fg-muted">Handled</span>}
      </span>
      {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--tt-primary)]" aria-label="Unread" />}
    </button>
  );
}
