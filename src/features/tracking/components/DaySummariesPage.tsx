'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { messageOf } from '@/lib/api/errors';
import { getDays } from '../api/tracking.api';
import { PAGE_SIZE, kmText, minutesText, todayInput } from '../constants/tracking.constants';
import type { DayRowDto, TrackingFilters as Filters } from '../types/tracking.dto';
import { TrackingFilters } from './TrackingFilters';

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted';

export function DaySummariesPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [date, setDate] = useState(todayInput());
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DayRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getDays(date, filters, page, PAGE_SIZE, controller.signal)
      .then((r) => { setRows(r.days); setTotal(r.total); setError(null); })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, filters, page]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={date} max={todayInput()} onChange={(e) => { if (e.target.value) { setDate(e.target.value); setPage(1); } }} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-[var(--tt-primary)]" aria-label="Date" />
        <TrackingFilters value={filters} onChange={(f) => { setFilters(f); setPage(1); }} />
      </div>
      {error && <Alert message={error} tone="error" />}
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-surface shadow-xs">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="sticky top-0 border-b border-line bg-surface">
            <tr>
              <th className={th}>Employee</th><th className={th}>Distance</th><th className={th}>At site</th><th className={th}>Away</th><th className={th}>Moving</th><th className={th}>Standing</th><th className={th}>No signal / off</th><th className={th}>Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.employee_id} className="hover:bg-bg-subtle">
                <td className="px-3 py-2"><Link className="font-semibold text-fg underline-offset-2 hover:underline" href={`/org-admin/tracking/timeline?employee=${r.employee_id}&date=${date}`}>{r.name}</Link></td>
                <td className="px-3 py-2">{kmText(r.distance_m)}</td>
                <td className="px-3 py-2">{minutesText(r.site_minutes)}</td>
                <td className="px-3 py-2">{minutesText(r.outside_minutes)}</td>
                <td className="px-3 py-2">{minutesText(r.moving_minutes)}</td>
                <td className="px-3 py-2">{minutesText(r.stationary_minutes)}</td>
                <td className="px-3 py-2">{minutesText(r.gap_minutes + r.gps_off_minutes)}</td>
                <td className="px-3 py-2 text-xs text-[var(--tt-danger)]">{r.flags.map((f) => f.replaceAll('_', ' ').toLowerCase()).join(', ')}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-fg-muted">No tracking recorded on this date.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} pageSizeOptions={[PAGE_SIZE]} />
    </div>
  );
}
