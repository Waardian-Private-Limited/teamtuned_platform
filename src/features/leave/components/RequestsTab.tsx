'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/leave.api';
import type { RequestsResponse } from '../types/leave';
import { RequestsList } from './RequestsList';
import { LeaveEmptyState } from './LeaveEmptyState';

const STATUSES = ['', 'Pending', 'Approved', 'Rejected', 'Cancelled'];

export function RequestsTab({ onOpen, refreshKey }: { onOpen: (id: number) => void; refreshKey: number }) {
  const [status, setStatus] = React.useState('Pending');
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [data, setData] = React.useState<RequestsResponse | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => { const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 400); return () => clearTimeout(t); }, [searchInput]);
  React.useEffect(() => {
    api.listRequests({ status: status || undefined, search: search || undefined, subOrgId: subOrgId ?? undefined, page, pageSize })
      .then((r) => { setData(r); setError(''); }).catch((e) => setError(messageOf(e)));
  }, [status, search, subOrgId, page, pageSize, refreshKey]);

  const stats = data?.stats;
  const cards = [
    ['Pending', stats?.pending], ['Off today', stats?.on_leave_today], ['Approved this month', stats?.approved_this_month], ['Rejected', stats?.rejected],
  ] as const;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map(([label, n]) => (
          <div key={label} className="rounded-xl border border-line bg-surface px-4 py-3">
            <p className="text-xs text-fg-muted">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-fg">{n ?? '–'}</p>
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="flex h-9 w-full items-center rounded-lg border border-line px-2.5 focus-within:border-[var(--tt-primary)] sm:w-60">
            <Search className="h-3.5 w-3.5 text-fg-subtle" />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search employee…" className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-fg-subtle" />
          </div>
          <div className="flex gap-1 rounded-lg border border-line p-0.5">
            {STATUSES.map((s) => (
              <button key={s || 'all'} type="button" onClick={() => { setStatus(s); setPage(1); }} className={`rounded-md px-3 py-1 text-xs font-semibold ${status === s ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'text-fg-muted hover:bg-bg-subtle'}`}>{s || 'All'}</button>
            ))}
          </div>
          <SubOrgFilter value={subOrgId} onChange={(v) => { setSubOrgId(v); setPage(1); }} />
        </div>
        {error && <div className="p-3"><Alert message={error} tone="error" /></div>}
        {!data ? <div className="h-40 animate-pulse bg-bg-subtle/60" />
          : data.requests.length === 0 ? <LeaveEmptyState title="No leave requests" text={status ? `No ${status.toLowerCase()} requests right now.` : 'Requests will show up here as employees apply.'} />
          : <div className="min-h-0 flex-1 overflow-y-auto"><RequestsList rows={data.requests} showEmployee onOpen={(r) => onOpen(r.id)} /></div>}
        {data && data.total > 0 && (
          <div className="border-t border-line px-4 py-2.5">
            <Pagination currentPage={page} totalPages={data.pages} totalItems={data.total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
          </div>
        )}
      </div>
    </div>
  );
}
