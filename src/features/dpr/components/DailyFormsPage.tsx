'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { formatDate, formatDayTime } from '@/lib/datetime';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { btnClass, PageHead, Panel, Table, td } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import type { DailyRow, ReportKind } from '../api/dpr.api';
import { n1, Tag } from './parts';

type TabKey = 'pending' | 'submitted';
const KIND: Record<ReportKind, string> = { progress: 'Planning', billing: 'CBD' };
const selectClass = 'h-9 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';

function StatusTag({ r }: { r: DailyRow }) {
  if (r.status === 'submitted') return <Tag tone="done">Submitted{r.edit_count ? ` · corrected ${r.edit_count}×` : ''}</Tag>;
  if (r.status === 'draft') return <Tag tone="wait">Draft</Tag>;
  return <Tag tone="late">Not filled</Tag>;
}

/**
 * Daily forms, as in the old DPR: what is still to fill (missing or draft) and what was submitted, for the sites assigned to the person
 * (every site for an admin), a page at a time.
 */
export function DprDailyFormsPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabKey>('pending');
  const [site, setSite] = React.useState<number | ''>('');
  const [kind, setKind] = React.useState<ReportKind>('progress');
  const [range, setRange] = React.useState({ from: '', to: '' });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const { data, loading, error } = useAsync(
    () => api.dailyForms({ tab, site_id: site || undefined, kind, from: range.from || undefined, to: range.to || undefined, page, pageSize }),
    [tab, site, kind, range.from, range.to, page, pageSize],
  );
  const link = (r: DailyRow) => `${basePath}/daily/${r.site_id}/${r.report_on}?kind=${r.kind}`;
  const reset = () => setPage(1);
  // Someone assigned only CBD forms lands on them.
  React.useEffect(() => {
    if (data && !data.kinds.progress && data.kinds.billing && kind === 'progress') { setKind('billing'); setSite(''); setPage(1); }
  }, [data, kind]);
  const unassigned = data && !data.kinds.progress && !data.kinds.billing;
  const action = (r: DailyRow) => (r.can_write && r.status !== 'submitted'
    ? <Link href={link(r)} className={btnClass('primary', 'sm')}><ClipboardList className="h-3.5 w-3.5" />{r.status === 'draft' ? 'Continue' : 'Fill'}</Link>
    : <Link href={link(r)} className={btnClass('secondary', 'sm')}>{r.can_write ? 'Correct' : 'View'}</Link>);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      <PageHead
        title={kind === 'progress' ? 'Planning forms' : 'CBD forms'} count={data?.total}
        subtitle={data ? `${kind === 'progress' ? 'Daily progress report' : 'Billing, reconciliation and documents'} · ${formatDate(data.from)} to ${formatDate(data.to)}` : 'Daily forms to fill and filed'}
        actions={(
          <>
            {data?.kinds.progress && data.kinds.billing && (
              <SegmentedControl fitText value={kind} onChange={(v) => { setKind(v); setSite(''); reset(); }} options={[{ value: 'progress', label: 'Planning forms' }, { value: 'billing', label: 'CBD forms' }]} />
            )}
            <SegmentedControl fitText value={tab} onChange={(v) => { setTab(v); setRange({ from: '', to: '' }); reset(); }} options={[{ value: 'pending', label: 'To fill' }, { value: 'submitted', label: 'Submitted' }]} />
          </>
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <select value={site} onChange={(e) => { setSite(e.target.value ? Number(e.target.value) : ''); reset(); }} aria-label="Site" className={selectClass}>
            <option value="">All sites</option>
            {data?.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={range.from || data?.from || ''} max={data?.today} onChange={(e) => { setRange({ ...range, from: e.target.value }); reset(); }} aria-label="From" className={selectClass} />
          <input type="date" value={range.to || data?.to || ''} max={data?.today} onChange={(e) => { setRange({ ...range, to: e.target.value }); reset(); }} aria-label="To" className={selectClass} />
        </div>
      </PageHead>
      {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
      <Panel>
        {loading && !data ? <div className="p-4"><TableSkeleton rows={6} columns={6} /></div> : !data?.items.length ? (
          <div className="p-6">
            {unassigned ? (
              <EmptyState illustration={{ src: '/vectors/flow.svg', width: 180, height: 140, alt: '' }} title="No site assigned to you"
                description="Daily forms show for the sites where you fill or review them. Ask your planner to add you in Planning › Site setup › People." />
            ) : (
              <EmptyState illustration={{ src: '/vectors/flow.svg', width: 180, height: 140, alt: '' }} title={tab === 'pending' ? `No ${KIND[kind]} forms to fill` : 'Nothing submitted in these dates'}
                description={tab === 'pending' ? 'A form comes up for every report day of an assigned site that has a plan (Planning › Plans). Every one in these dates is filed.' : 'Change the dates or the site.'} />
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table minWidth={760} head={[{ label: 'Date' }, { label: 'Site' }, { label: 'Status' }, { label: 'Filled by' }, ...(kind === 'progress' ? [{ label: 'Concrete', className: 'text-right' }] : []), { label: '', className: 'text-right' }]}>
                {data.items.map((r) => (
                  <tr key={`${r.site_id}:${r.kind}:${r.report_on}`} className="cursor-pointer hover:bg-bg-subtle/60" onClick={() => router.push(link(r))}>
                    <td className={`${td} whitespace-nowrap font-medium`}>{formatDate(r.report_on, 'weekday')}{r.report_on === data.today && <span className="ml-1.5 text-[11px] text-fg-muted">today</span>}</td>
                    <td className={td}>{r.site.name}</td>
                    <td className={td}><StatusTag r={r} /></td>
                    <td className={`${td} text-fg-muted`}>{r.filled_by_name || '—'}{r.submitted_at && <span className="block text-[11px]">{formatDayTime(r.submitted_at)}</span>}</td>
                    {kind === 'progress' && <td className={`${td} text-right tabular-nums`}>{r.concrete_m3 !== null ? `${n1(r.concrete_m3)} m³` : '—'}</td>}
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>{action(r)}</td>
                  </tr>
                ))}
              </Table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {data.items.map((r) => (
                <li key={`${r.site_id}:${r.kind}:${r.report_on}`} className="flex items-center justify-between gap-3 p-3.5">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-fg">{r.site.name}</p>
                    <p className="text-xs text-fg-muted">{formatDate(r.report_on, 'weekday')} · {KIND[r.kind]}{r.kind === 'progress' && r.concrete_m3 ? ` · ${n1(r.concrete_m3)} m³` : ''}</p>
                    <StatusTag r={r} />
                  </div>
                  {action(r)}
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-2">
              <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(data.total / data.pageSize))} totalItems={data.total} pageSize={data.pageSize} onPageChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); reset(); }} />
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
