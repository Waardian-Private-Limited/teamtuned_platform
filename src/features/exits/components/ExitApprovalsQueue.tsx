'use client';

import React from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { RequestDrawer } from '@/features/approvals/components/RequestDrawer';
import { formatDate } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/exits.api';
import { Skeleton, TonePill } from './parts';

type Tab = 'pending' | 'history';
const TABS = [{ value: 'pending' as Tab, label: 'Waiting for me' }, { value: 'history' as Tab, label: 'Decided by me' }];

/** The Exit tab of the approvals inbox: exit requests waiting on (or decided by) the signed-in approver. Opens the standard request drawer. */
export function ExitApprovalsQueue({ tabs, headerAction }: { tabs: React.ReactNode; headerAction?: React.ReactNode }) {
  const [tab, setTab] = React.useState<Tab>('pending');
  const [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof api.exitInbox>>['items']>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    const ctl = new AbortController();
    setLoading(true);
    api.exitInbox(tab, page, ctl.signal)
      .then((r) => { setItems(r.items); setHasMore(r.hasMore); setError(null); })
      .catch((e) => { if (!ctl.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
  }, [tab, page, nonce]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Approvals</h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-72"><SegmentedControl options={TABS} value={tab} onChange={(t) => { setTab(t); setPage(1); }} /></div>
            {headerAction}
          </div>
        </div>
        {tabs}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border border-line bg-surface shadow-xs">
        {error && <div className="border-b border-line p-3"><Alert message={error} /></div>}
        {loading ? <div className="space-y-2 p-4" aria-busy="true">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div> : items.length === 0 ? (
          <EmptyState compact title={tab === 'pending' ? 'No exit requests waiting' : 'Nothing decided yet'} description="Resignations that need your decision show up here." />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setOpenId(r.id)} className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-bg-subtle/60 sm:px-4">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-fg">{r.requester.name}{r.requester.code ? ` (${r.requester.code})` : ''}</span>
                    <span className="block text-xs text-fg-muted">{r.typeLabel} · sent {formatDate(r.createdAt.slice(0, 10))}{r.stepName ? ` · ${r.stepName}` : ''}</span>
                  </span>
                  <TonePill label={r.status === 'pending' ? 'Pending' : r.status.replace(/_/g, ' ')} tone={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'neutral'} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {(page > 1 || hasMore) && (
          <div className="mt-auto flex items-center justify-between border-t border-line px-4 py-2.5 text-sm">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="font-semibold text-fg disabled:opacity-40">Previous</button>
            <span className="text-fg-muted">Page {page}</span>
            <button type="button" disabled={!hasMore} onClick={() => setPage((p) => p + 1)} className="font-semibold text-fg disabled:opacity-40">Next</button>
          </div>
        )}
        <p className="border-t border-line px-4 py-2 text-xs text-fg-muted">HR can follow every case under <Link href="/org-admin/exits" className="font-semibold text-fg underline">Exits</Link>.</p>
      </div>
      <RequestDrawer id={openId} onClose={() => setOpenId(null)} onChanged={() => setNonce((n) => n + 1)} />
    </div>
  );
}
