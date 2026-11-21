'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileSpreadsheet, X } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { messageOf } from '@/lib/api/errors';
import { usePermission } from '@/lib/hooks/usePermission';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../../api/dc.api';
import { DC_PERMISSIONS } from '../../../constants/dc.constants';
import { useAsync } from '../../../hooks/useAsync';
import type { InsightFilters } from '../../../types/dc.types';
import { addDaysIso, todayIso } from '../../../utils/schema';
import { Btn, PageHeader, Pill, inputCls } from '../../shared/Ui';
import { PdfButton } from '../../submissions/SubmissionsPage';
import { describeSchedule, describeWho } from '../AssignmentsPage';
import { OverviewTab } from './OverviewTab';
import { ResponsesTab } from './ResponsesTab';
import { BoardsTab } from './boards/BoardsTab';

type Tab = 'overview' | 'boards' | 'responses';
const TABS: Tab[] = ['overview', 'boards', 'responses'];
const num = (v: string | null) => (Number(v) > 0 ? Number(v) : null);
const str = (v: string | null) => v || undefined;

/** Filters live in the URL, so a link opens the same view. */
function fromUrl(p: URLSearchParams): InsightFilters {
  return {
    from: str(p.get('from')), to: str(p.get('to')), siteId: num(p.get('site')), departmentId: num(p.get('department')), employeeId: num(p.get('person')),
    status: str(p.get('status')), late: p.get('late') === '1' || undefined, search: str(p.get('q')),
  };
}

function toUrl(f: InsightFilters, tab: Tab) {
  const q = new URLSearchParams();
  const put = (k: string, v: unknown) => { if (v !== undefined && v !== null && v !== '' && v !== false) q.set(k, v === true ? '1' : String(v)); };
  put('tab', tab === 'overview' ? null : tab); put('from', f.from); put('to', f.to); put('site', f.siteId); put('department', f.departmentId); put('person', f.employeeId);
  put('status', f.status); put('late', f.late); put('q', f.search);
  return q.toString();
}

/** One assignment for management: progress and answers (Overview), every submission (Responses), Excel and PDF. */
export function AssignmentDashboard({ id, basePath }: { id: number; basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { can } = usePermission();
  const { track } = useDownloadCenter();
  const [tab, setTab] = useState<Tab>(TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'overview');
  const [filters, setFilters] = useState<InsightFilters>(() => fromUrl(params));
  const [exporting, setExporting] = useState(false);
  const change = (f: Partial<InsightFilters>) => setFilters((cur) => ({ ...cur, ...f }));
  useEffect(() => { router.replace(`?${toUrl(filters, tab)}`, { scroll: false }); }, [filters, tab, router]);

  // The dashboard ignores the Responses-only filters, so changing them does not reload it.
  const base = { from: filters.from, to: filters.to, siteId: filters.siteId, departmentId: filters.departmentId, employeeId: filters.employeeId };
  const { data, loading, error } = useAsync(() => api.assignmentInsights(id, base), [id, JSON.stringify(base)]);
  const a = data?.assignment;
  const range = data?.range;
  const today = todayIso();
  const last = a?.end_date && a.end_date < today ? a.end_date : today;
  const people = useMemo(() => (data?.options.people || []).filter((p) => !filters.departmentId || p.department_id === filters.departmentId), [data, filters.departmentId]);

  const QUICK = [
    { label: '7 days', from: addDaysIso(last, -6), to: last },
    { label: '30 days', from: addDaysIso(last, -29), to: last },
    { label: 'This month', from: `${last.slice(0, 7)}-01`, to: last },
    ...(a ? [{ label: 'Whole assignment', from: a.start_date, to: last }] : []),
  ];
  const activeQuick = QUICK.find((q) => range && q.to === range.to && (q.from === range.from || (a && q.from < a.start_date && range.from === a.start_date)));

  // What the export and PDF take: the dates in effect, plus the Responses filters when that tab is open.
  const exportFilters: InsightFilters = { ...base, from: range?.from, to: range?.to, ...(tab === 'responses' ? { status: filters.status, late: filters.late, search: filters.search } : {}) };
  const exportExcel = async () => {
    setExporting(true);
    try { track(await api.exportAssignment(id, exportFilters)); showSuccess('Preparing the Excel file. It will appear in Downloads.'); } catch (e) { showError(messageOf(e)); } finally { setExporting(false); }
  };
  const narrowed = Boolean(filters.siteId || filters.departmentId || filters.employeeId);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <Link href={`${basePath}/assignments`} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" />Assignments</Link>
      <PageHeader title={a?.title || 'Assignment'} subtitle={a ? `${a.form_name} · ${describeWho(a)} · ${describeSchedule(a)}` : undefined}
        actions={<>
          {a && <Pill label={a.status} tone={a.status === 'active' ? 'strong' : 'neutral'} />}
          {can(DC_PERMISSIONS.EXPORT) && range && (<>
            <Btn icon={<FileSpreadsheet className="h-4 w-4" />} busy={exporting} onClick={exportExcel}>Excel</Btn>
            <PdfButton label="PDF" load={() => api.assignmentPdf(id, exportFilters)} name={`${(a?.title || 'assignment').replace(/[^\w]+/g, '-')}-${range.from}-to-${range.to}.pdf`} />
          </>)}
        </>} />

      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-line">{QUICK.map((q) => (
            <button key={q.label} type="button" onClick={() => change({ from: q.from, to: q.to })}
              className={`h-9 px-3 text-xs font-semibold ${activeQuick?.label === q.label ? 'bg-fg text-[var(--tt-on-primary)]' : 'bg-surface text-fg-muted hover:bg-bg-subtle'}`}>{q.label}</button>
          ))}</div>
          <div className="flex items-center gap-1.5">
            <input type="date" aria-label="From" className={`${inputCls()} !h-9 !w-36`} value={range?.from || filters.from || ''} min={a?.start_date} max={last} onChange={(e) => change({ from: e.target.value || undefined })} />
            <span className="text-xs text-fg-muted">to</span>
            <input type="date" aria-label="To" className={`${inputCls()} !h-9 !w-36`} value={range?.to || filters.to || ''} min={a?.start_date} max={last} onChange={(e) => change({ to: e.target.value || undefined })} />
          </div>
          <select aria-label="Site" className={`${inputCls()} !h-9 !w-40`} value={filters.siteId ?? ''} onChange={(e) => change({ siteId: num(e.target.value) })}>
            <option value="">All sites</option>{data?.options.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select aria-label="Department" className={`${inputCls()} !h-9 !w-44`} value={filters.departmentId ?? ''} onChange={(e) => change({ departmentId: num(e.target.value), employeeId: null })}>
            <option value="">All departments</option>{data?.options.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select aria-label="Person" className={`${inputCls()} !h-9 !w-48`} value={filters.employeeId ?? ''} onChange={(e) => change({ employeeId: num(e.target.value) })}>
            <option value="">Everyone</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>)}
          </select>
          {narrowed && <Btn icon={<X className="h-4 w-4" />} onClick={() => change({ siteId: null, departmentId: null, employeeId: null })}>Clear</Btn>}
        </div>
      </div>

      <SegmentedControl<Tab> className="mb-4" value={tab} onChange={setTab} options={[{ value: 'overview', label: 'Overview' }, { value: 'boards', label: 'Boards' }, { value: 'responses', label: 'Responses' }]} />
      {error && <p className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {tab === 'overview' && <OverviewTab data={data} loading={loading} onPerson={(employeeId) => change({ employeeId })} />}
      {tab === 'boards' && a && <BoardsTab formId={a.form_id} assignmentId={id} scheduled={a.mode === 'scheduled'} filters={{ ...base, from: range?.from, to: range?.to }} options={data?.options || { sites: [], departments: [], people: [] }} />}
      {tab === 'responses' && <ResponsesTab id={id} filters={{ ...filters, from: range?.from ?? filters.from, to: range?.to ?? filters.to }} onChange={change} />}
    </div>
  );
}
