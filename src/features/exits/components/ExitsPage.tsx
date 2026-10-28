'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, ClipboardCheck, MessageSquareText, Search } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { formatDate } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/exits.api';
import { LIST_TABS, SETTLEMENT_STATUS_META, TYPE_LABEL, EXIT_PERMISSIONS, type ListTab } from '../constants/exits.constants';
import { useExitsBasePath } from '../hooks/useExitsBasePath';
import type { ExitList, ExitType } from '../types/exits';
import { usePermission } from '@/lib/hooks/usePermission';
import { StatusPill, TonePill } from './parts';
import type { ExitCaseSummary } from '../types/exits';

const PAGE_SIZE = 25;

/** Clearance and settlement chips, shown next to the status once a case is that far. */
function StageChips({ r }: { r: ExitCaseSummary }) {
  const chips: React.ReactNode[] = [];
  if (r.clearance_total) chips.push(<TonePill key="c" label={r.clearance_pending ? `Clearance ${r.clearance_total - r.clearance_pending}/${r.clearance_total}` : 'Clearance done'} tone={r.clearance_pending ? 'warning' : 'success'} />);
  if (r.settlement_status) { const m = SETTLEMENT_STATUS_META[r.settlement_status]; chips.push(<TonePill key="s" label={`F&F ${m.label.toLowerCase()}`} tone={m.tone} />); }
  if (r.settlement_overdue && r.settlement_status !== 'paid') chips.push(<TonePill key="o" label="Overdue" tone="danger" />);
  return chips.length ? <div className="mt-1 flex flex-wrap gap-1">{chips}</div> : null;
}

/** The HR desk: every exit case by stage. The server decides what the person may see. */
export function ExitsPage() {
  const base = useExitsBasePath();
  const { can } = usePermission();
  const canManage = can(EXIT_PERMISSIONS.MANAGE);
  const [tab, setTab] = React.useState<ListTab>('requests');
  const [type, setType] = React.useState<ExitType | ''>('');
  const [input, setInput] = React.useState('');
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<ExitList | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => { setQ(input.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [input]);

  React.useEffect(() => {
    const ctl = new AbortController();
    setLoading(true);
    api.listExits({ status: LIST_TABS.find((t) => t.value === tab)!.status, type: type || undefined, q: q || undefined, page, limit: PAGE_SIZE }, ctl.signal)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => { if (!ctl.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
  }, [tab, type, q, page]);

  const count = (t: (typeof LIST_TABS)[number]) => data ? t.count.reduce((s, k) => s + (data.counts[k] ?? 0), 0) : null;
  const rows = data?.items ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Exits</h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href={`${base}/insights`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm"><BarChart3 className="h-4 w-4" /> Insights</Link>
            {canManage && <Link href={`${base}/clearance-templates`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm"><ClipboardCheck className="h-4 w-4" /> Clearance setup</Link>}
            {canManage && <Link href={`${base}/interview-form`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm"><MessageSquareText className="h-4 w-4" /> Interview form</Link>}
            <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 sm:w-64">
              <Search className="h-4 w-4 text-fg-subtle" aria-hidden />
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search name or code" aria-label="Search exits" className="w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle" />
            </label>
            <select value={type} onChange={(e) => { setType(e.target.value as ExitType | ''); setPage(1); }} aria-label="Exit type" className="h-9 rounded-lg border border-line bg-surface px-2 text-sm text-fg">
              <option value="">All types</option>
              {(Object.keys(TYPE_LABEL) as ExitType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>
        </div>
        <div role="tablist" aria-label="Stage" className="flex gap-1 overflow-x-auto border-b border-line tt-scroll-hidden">
          {LIST_TABS.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} onClick={() => { setTab(t.value); setPage(1); }}
              className={cx('-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors', tab === t.value ? 'border-[var(--tt-primary)] text-fg' : 'border-transparent text-fg-muted hover:text-fg')}>
              {t.label}{count(t) !== null && <span className="rounded-md border border-line bg-bg-subtle px-1.5 text-xs tabular-nums text-fg-muted">{count(t)}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {error && <div className="border-b border-line p-3"><Alert message={error} /></div>}
        {loading && !data ? <TableSkeleton rows={6} columns={5} /> : rows.length === 0 ? (
          <EmptyState compact title="No exits here" description={q || type ? 'Nothing matches these filters.' : 'Cases show up here as people resign or HR starts an exit.'} />
        ) : (
          <>
            <div className={cx('min-h-0 flex-1 overflow-auto', loading && 'opacity-70')}>
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="sticky top-0 bg-bg-subtle text-xs text-fg-muted">
                  <tr>{['Employee', 'Type', 'Status', 'Resigned', 'Last day'].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-bg-subtle/60">
                      <td className="px-4 py-3"><Link href={`${base}/${r.id}`} className="block min-w-0"><span className="block truncate font-semibold text-fg">{r.employee.name}</span><span className="block truncate text-xs text-fg-muted">{[r.employee.code, r.employee.designation, r.employee.department].filter(Boolean).join(' · ')}</span></Link></td>
                      <td className="px-4 py-3 text-fg">{TYPE_LABEL[r.type]}</td>
                      <td className="px-4 py-3"><StatusPill status={r.status} /><StageChips r={r} /></td>
                      <td className="px-4 py-3 text-fg-muted">{formatDate(r.resigned_on)}</td>
                      <td className="px-4 py-3 text-fg-muted">{formatDate(r.agreed_lwd || r.requested_lwd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-line md:hidden">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`${base}/${r.id}`} className="block p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-fg">{r.employee.name}</p><p className="truncate text-xs text-fg-muted">{[r.employee.code, r.employee.designation].filter(Boolean).join(' · ')}</p></div>
                        <div className="shrink-0 text-right"><StatusPill status={r.status} /><StageChips r={r} /></div>
                      </div>
                      <p className="mt-2 text-xs text-fg-muted">{TYPE_LABEL[r.type]} · last day {formatDate(r.agreed_lwd || r.requested_lwd)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-line bg-surface px-4 py-2.5">
              <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))} totalItems={data?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
