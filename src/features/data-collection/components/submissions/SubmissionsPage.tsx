'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import * as api from '../../api/dc.api';
import { SUBMISSION_LABEL } from '../../constants/dc.constants';
import { useAsync } from '../../hooks/useAsync';
import type { SubmissionStatus } from '../../types/dc.types';
import { Btn, Card, PageHeader, Pill, Skeleton, inputCls, statusTone } from '../shared/Ui';
import { FormRenderer } from '../renderer/FormRenderer';

export function SubmissionDrawer({ id, mine, onClose }: { id: number | null; mine?: boolean; onClose: () => void }) {
  const { data, loading, error } = useAsync(() => (mine ? api.mySubmission(id as number) : api.getSubmission(id as number)), [id, mine], id !== null);
  return (
    <Drawer open={id !== null} onClose={onClose} title={data?.form_name || 'Submission'} maxWidthClassName="sm:max-w-xl">
      <div className="space-y-4 p-4 sm:p-6">
        {loading && !data && <Skeleton className="h-48" />}
        {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
        {data && (<>
          <div className="flex flex-wrap items-center gap-2"><Pill label={SUBMISSION_LABEL[data.status] || data.status} tone={statusTone(data.status)} />{data.is_late ? <Pill label="Late" tone="bad" /> : null}<span className="text-xs text-fg-muted">{data.employee_name}{data.employee_code ? ` (${data.employee_code})` : ''}{data.site_name ? ` · ${data.site_name}` : ''}</span></div>
          <p className="text-xs text-fg-muted">For {data.work_date} · sent {new Date(data.submitted_at).toLocaleString()}</p>
          {data.review_note && <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg"><span className="font-semibold">Reviewer: </span>{data.review_note}</p>}
          {data.legacy_review && data.legacy_review.length > 0 && (
            <div className="rounded-lg border border-line p-3"><h4 className="mb-1.5 text-xs font-bold text-fg">Earlier review (old system)</h4><ul className="space-y-1 text-xs text-fg-muted">{data.legacy_review.map((r, i) => <li key={i}>Level {r.level}: {r.status.replace(/_/g, ' ')}{r.comments ? ` — ${r.comments}` : ''}</li>)}</ul></div>
          )}
          <FormRenderer schema={data.schema} values={data.values} onChange={() => undefined} env={{ readOnly: true }} system={{ name: data.employee_name, at: data.captured_at || data.submitted_at, geo: data.geo }} />
        </>)}
      </div>
    </Drawer>
  );
}

const STATUSES: SubmissionStatus[] = ['submitted', 'in_review', 'approved', 'returned', 'rejected'];

export function SubmissionsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formId, setFormId] = useState<number | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const forms = useAsync(() => api.listForms({ pageSize: 100, status: 'active' }), []);
  const { data, loading, error } = useAsync(() => api.listSubmissions({ search: search || undefined, status: status || undefined, formId, from: from || undefined, to: to || undefined, page, pageSize: 25 }), [search, status, formId, from, to, page]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <PageHeader title="Submissions" subtitle="Everything that was filled in, newest first." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-52"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" /><input aria-label="Search by person" className={`${inputCls()} pl-9`} placeholder="Search by name or code" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <select aria-label="Form" className={`${inputCls()} !w-44`} value={formId ?? ''} onChange={(e) => { setFormId(e.target.value ? Number(e.target.value) : null); setPage(1); }}><option value="">All forms</option>{forms.data?.items.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <select aria-label="Status" className={`${inputCls()} !w-36`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Any status</option>{STATUSES.map((s) => <option key={s} value={s}>{SUBMISSION_LABEL[s]}</option>)}</select>
        <input aria-label="From" type="date" className={`${inputCls()} !w-36`} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <input aria-label="To" type="date" className={`${inputCls()} !w-36`} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
      </div>
      {error && <p className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {loading && !data ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        : !data || data.items.length === 0 ? <Card className="flex flex-col items-center py-10 text-center"><Image src="/vectors/review.svg" alt="" width={200} height={140} className="mb-4 h-auto max-h-36 w-auto" /><h3 className="text-sm font-bold text-fg">No submissions found</h3><p className="mt-1 text-xs text-fg-muted">Try a wider date range or clear the filters.</p></Card>
        : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <ul className="divide-y divide-line">{data.items.map((s) => (
              <li key={s.id}><button type="button" onClick={() => setOpen(s.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-subtle">
                <div className="min-w-0"><div className="truncate text-sm font-semibold text-fg">{s.form_name}</div><div className="truncate text-xs text-fg-muted">{s.employee_name}{s.employee_code ? ` (${s.employee_code})` : ''}{s.site_name ? ` · ${s.site_name}` : ''} · {s.work_date}</div></div>
                <div className="flex shrink-0 gap-1.5">{s.is_late ? <Pill label="Late" tone="bad" /> : null}<Pill label={SUBMISSION_LABEL[s.status] || s.status} tone={statusTone(s.status)} /></div>
              </button></li>
            ))}</ul>
          </div>
        )}
      {data && <p className="mt-2 text-xs text-fg-muted">{data.total} submission{data.total === 1 ? '' : 's'} from {data.range.from} to {data.range.to}</p>}
      {pages > 1 && <div className="mt-3 flex items-center justify-center gap-2"><Btn disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn><span className="text-xs text-fg-muted">Page {page} of {pages}</span><Btn disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Btn></div>}
      <SubmissionDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  );
}
