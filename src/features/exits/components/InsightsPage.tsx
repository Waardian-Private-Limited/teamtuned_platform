'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/FormControls';
import { inr } from '@/features/compensation/utils/format';
import { addDays, formatMonth, orgToday } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/exits.api';
import { REASON_LABEL } from '../constants/exits.constants';
import { useExitsBasePath } from '../hooks/useExitsBasePath';
import type { ExitInsights, InsightCount, ReasonCategory } from '../types/exits';
import { Card, Skeleton } from './parts';

const PRIMARY = 'bg-[var(--tt-primary)]';
const SECOND = 'bg-[var(--tt-accent)]';

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-4">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="mt-1 truncate text-2xl font-extrabold tabular-nums text-fg">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

/** Horizontal bars: one hue, value printed at the end so colour never carries the number alone. */
function Bars({ rows, empty = 'No data in this period.' }: { rows: { label: string; count: number }[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.length === 0) return <p className="text-sm text-fg-muted">{empty}</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-2 text-sm sm:grid-cols-[minmax(0,12rem)_1fr_2.5rem]">
          <span className="truncate text-fg" title={r.label}>{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-bg-subtle" role="presentation"><span className={`block h-full rounded-full ${PRIMARY}`} style={{ width: `${(r.count / max) * 100}%` }} /></span>
          <span className="text-right font-semibold tabular-nums text-fg">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

const labelled = (rows: InsightCount[], map?: (k: string) => string) => rows.map((r) => ({ label: r.label || (map ? map(r.key) : r.key), count: r.count }));

function Monthly({ rows }: { rows: ExitInsights['monthly'] }) {
  const max = Math.max(1, ...rows.map((r) => r.voluntary + r.involuntary));
  if (rows.length === 0) return <p className="text-sm text-fg-muted">No exits in this period.</p>;
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${PRIMARY}`} />Voluntary</span>
        <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${SECOND}`} />Involuntary</span>
      </div>
      <div className="overflow-x-auto tt-scroll-hidden">
        <div className="flex h-44 min-w-max items-end gap-2" role="img" aria-label="Exits per month, voluntary and involuntary">
          {rows.map((r) => (
            <div key={r.month} className="flex w-9 flex-col items-center gap-1" title={`${formatMonth(r.month)}: ${r.voluntary} voluntary, ${r.involuntary} involuntary`}>
              <span className="text-[11px] font-semibold tabular-nums text-fg">{r.voluntary + r.involuntary || ''}</span>
              <div className="flex w-full flex-col justify-end gap-0.5" style={{ height: `${((r.voluntary + r.involuntary) / max) * 100}%`, minHeight: 2 }}>
                {r.involuntary > 0 && <span className={`block rounded-t ${SECOND}`} style={{ flexGrow: r.involuntary }} />}
                {r.voluntary > 0 && <span className={`block rounded-b ${PRIMARY}`} style={{ flexGrow: r.voluntary }} />}
              </div>
              <span className="text-[10px] text-fg-muted">{formatMonth(r.month).slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </div>
      <details className="mt-3 text-xs text-fg-muted">
        <summary className="cursor-pointer font-semibold">View as table</summary>
        <table className="mt-2 w-full text-left"><thead><tr><th className="py-1 pr-3">Month</th><th className="pr-3">Voluntary</th><th>Involuntary</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.month}><td className="py-0.5 pr-3">{formatMonth(r.month)}</td><td className="pr-3 tabular-nums">{r.voluntary}</td><td className="tabular-nums">{r.involuntary}</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}

/** Attrition dashboard: who leaves, why, and what retention efforts achieve. */
export function InsightsPage() {
  const base = useExitsBasePath();
  const [from, setFrom] = React.useState(() => addDays(orgToday(), -365));
  const [to, setTo] = React.useState(() => orgToday());
  const [data, setData] = React.useState<ExitInsights | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!from || !to || from > to) return;
    const ctl = new AbortController();
    setLoading(true);
    api.insights({ from, to }, ctl.signal)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => { if (!ctl.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
  }, [from, to]);

  const t = data?.totals;
  const pctOf = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '0%');
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-8">
      <Link href={base} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> All exits</Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0"><h1 className="text-xl font-extrabold text-fg sm:text-2xl">Attrition insights</h1><p className="text-sm text-fg-muted">Exits in the chosen period, by when the employee left.</p></div>
        <div className="grid grid-cols-2 gap-2">
          <TextField label="From" type="date" value={from} max={to} onChange={setFrom} />
          <TextField label="To" type="date" value={to} min={from} onChange={setTo} />
        </div>
      </header>
      {error && <Alert message={error} />}
      {loading && !data ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div> : !data || !t ? null : t.exits === 0 ? (
        <Card><EmptyState compact title="No exits in this period" description="Pick a wider date range to see attrition trends." /></Card>
      ) : (
        <div className={loading ? 'space-y-4 opacity-70' : 'space-y-4'}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total exits" value={t.exits} />
            <Stat label="Voluntary" value={t.voluntary} hint={`${pctOf(t.voluntary, t.exits)} of exits; ${t.involuntary} involuntary`} />
            <Stat label="Regrettable" value={t.regrettable} hint={`${pctOf(t.regrettable, t.exits)} of exits`} />
            <Stat label="Boomerangs" value={t.boomerangs} hint="Rejoined after leaving" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Retention offers" value={data.retention.offers} hint={`${data.retention.accepted} accepted`} />
            <Stat label="Offer success rate" value={data.retention.success_rate == null ? '—' : `${Math.round(data.retention.success_rate * (data.retention.success_rate <= 1 ? 100 : 1))}%`} />
            <Stat label="Retention cost" value={inr(data.retention.cost)} />
            <Stat label="Notice buyout" value={inr(t.notice_buyout_total)} />
          </div>
          <Card title="Exits by month"><Monthly rows={data.monthly} /></Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Reasons"><Bars rows={labelled(data.by_reason, (k) => REASON_LABEL[k as ReasonCategory] || k)} /></Card>
            <Card title="Tenure at exit"><Bars rows={labelled(data.by_tenure_band)} /></Card>
            <Card title="By department"><Bars rows={labelled(data.by_department)} /></Card>
            <Card title="By manager"><Bars rows={labelled(data.by_manager)} /></Card>
          </div>
        </div>
      )}
    </div>
  );
}
