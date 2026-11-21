'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import * as api from '../../../api/dc.api';
import { SUBMISSION_LABEL } from '../../../constants/dc.constants';
import { useAsync } from '../../../hooks/useAsync';
import type { InsightFilters, SubmissionStatus } from '../../../types/dc.types';
import { Btn, Card, Checkbox, Pill, Skeleton, inputCls, statusTone } from '../../shared/Ui';
import { SubmissionDrawer } from '../../submissions/SubmissionsPage';

const STATUSES: SubmissionStatus[] = ['submitted', 'in_review', 'approved', 'returned', 'rejected'];
const PAGE_SIZE = 50;
const STICKY = 'sticky z-[1] bg-surface group-hover:bg-bg-subtle';

/** Every submission in the filters, one column per answer. Status, late and search narrow it further (and the export). */
export function ResponsesTab({ id, filters, onChange }: { id: number; filters: InsightFilters; onChange: (f: Partial<InsightFilters>) => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(filters.search || '');
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { const t = setTimeout(() => { if ((filters.search || '') !== search.trim()) onChange({ search: search.trim() || undefined }); }, 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  const key = JSON.stringify(filters);
  useEffect(() => setPage(1), [key]);
  const { data, loading, error } = useAsync(() => api.assignmentResponses(id, { ...filters, page, pageSize: PAGE_SIZE }), [id, key, page]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-56 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" /><input aria-label="Search people" className={`${inputCls()} pl-9`} placeholder="Search name or code" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select aria-label="Status" className={`${inputCls()} !w-40`} value={filters.status || ''} onChange={(e) => onChange({ status: e.target.value || undefined })}>
          <option value="">Any status</option>{STATUSES.map((s) => <option key={s} value={s}>{SUBMISSION_LABEL[s]}</option>)}
        </select>
        <Checkbox checked={Boolean(filters.late)} onChange={(v) => onChange({ late: v || undefined })} label="Late only" />
      </div>
      {error && <p className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {!data && loading ? <Skeleton className="h-80" /> : data && data.items.length === 0 ? (
        <Card className="flex flex-col items-center py-10 text-center"><Image src="/vectors/flow.svg" alt="" width={200} height={140} className="mb-4 h-auto max-h-36 w-auto" /><h3 className="text-sm font-bold text-fg">No submissions match</h3><p className="mt-1 max-w-sm text-xs text-fg-muted">Try other dates or clear a filter.</p></Card>
      ) : data && (
        <Card className={`!p-0 overflow-hidden ${loading ? 'opacity-60' : ''}`}>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-max min-w-full text-left text-sm">
              <thead className="sticky top-0 z-[2] border-b border-line bg-bg-subtle text-xs text-fg-muted">
                <tr>
                  <th className="sticky left-0 z-[3] w-28 bg-bg-subtle px-3 py-2.5 font-semibold">Date</th>
                  <th className="sticky left-28 z-[3] min-w-44 bg-bg-subtle px-3 py-2.5 font-semibold">Person</th>
                  <th className="px-3 py-2.5 font-semibold">Department</th>
                  <th className="px-3 py-2.5 font-semibold">Site</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  {data.columns.map((c) => <th key={c.key} className={`max-w-56 px-3 py-2.5 font-semibold ${c.numeric ? 'text-right' : ''}`} title={c.label}><span className="line-clamp-2">{c.label}</span></th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((r) => (
                  <tr key={r.id} tabIndex={0} onClick={() => setOpen(r.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(r.id); } }} aria-label={`Open submission from ${r.employee_name} on ${r.work_date}`}
                    className="group cursor-pointer outline-none hover:bg-bg-subtle focus-visible:bg-bg-subtle">
                    <td className={`${STICKY} left-0 w-28 px-3 py-2.5 text-xs tabular-nums text-fg-muted`}>{r.work_date}</td>
                    <td className={`${STICKY} left-28 min-w-44 px-3 py-2.5`}><span className="block max-w-56 truncate text-xs font-semibold text-fg">{r.employee_name}</span>{r.employee_code && <span className="text-[11px] text-fg-muted">{r.employee_code}</span>}</td>
                    <td className="px-3 py-2.5 text-xs text-fg-muted">{r.department_name || '–'}</td>
                    <td className="px-3 py-2.5 text-xs text-fg-muted">{r.site_name || '–'}</td>
                    <td className="px-3 py-2.5"><div className="flex gap-1"><Pill label={SUBMISSION_LABEL[r.status] || r.status} tone={statusTone(r.status)} />{r.is_late && <Pill label="Late" tone="bad" />}</div></td>
                    {data.columns.map((c) => <td key={c.key} className={`max-w-56 px-3 py-2.5 text-xs text-fg ${c.numeric ? 'text-right tabular-nums' : ''}`} title={r.values[c.key] || undefined}><span className="line-clamp-2 break-words">{r.values[c.key] || <span className="text-fg-subtle">–</span>}</span></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {data && data.total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
          <span>{data.total.toLocaleString()} submission{data.total === 1 ? '' : 's'}{loading ? ' · loading…' : ''}</span>
          {pages > 1 && <div className="flex items-center gap-2"><Btn disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</Btn><span>Page {page} of {pages}</span><Btn disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Next</Btn></div>}
        </div>
      )}
      <SubmissionDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  );
}
