'use client';

import React from 'react';
import type { NotificationItemDto } from '../types';
import { NotificationCard } from './NotificationCard';

const dayOf = (iso: string) => {
  const then = new Date(iso);
  const today = new Date();
  const diff = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) / 86400000);
  return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : 'Earlier';
};

/** Items grouped by day, with skeletons while loading, an empty state, an error with retry, and load-more. */
export function NotificationList({
  items, loading, error, emptyTitle, emptyHint, onOpen, onRetry, onLoadMore, loadingMore, compact,
}: {
  items: NotificationItemDto[];
  loading: boolean;
  error: string | null;
  emptyTitle: string;
  emptyHint: string;
  onOpen: (item: NotificationItemDto) => void;
  onRetry: () => void;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  compact?: boolean;
}) {
  if (loading && items.length === 0) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-bg-subtle" />)}</div>;
  }
  if (error && items.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm font-semibold text-fg">Couldn&apos;t load notifications</p>
        <p className="mt-1 text-xs text-fg-muted">{error}</p>
        <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg hover:bg-bg-subtle">Retry</button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/vectors/notifications.svg" alt="" className="mx-auto mb-4 h-40 w-40 opacity-90" />
        <p className="text-sm font-semibold text-fg">{emptyTitle}</p>
        <p className="mt-1 text-xs text-fg-muted">{emptyHint}</p>
      </div>
    );
  }
  let last = '';
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const day = dayOf(item.created_at);
        const heading = day !== last ? day : null;
        last = day;
        return (
          <React.Fragment key={item.id}>
            {heading && <p className="px-1 pb-0.5 pt-2 text-[11px] font-bold uppercase tracking-wider text-fg-muted">{heading}</p>}
            <NotificationCard item={item} onOpen={onOpen} compact={compact} />
          </React.Fragment>
        );
      })}
      {onLoadMore && (
        <button type="button" onClick={onLoadMore} disabled={loadingMore} className="mx-auto mt-2 block rounded-lg border border-line px-4 py-2 text-xs font-semibold text-fg hover:bg-bg-subtle disabled:opacity-50">
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
