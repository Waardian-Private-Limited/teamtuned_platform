'use client';

import { LABOUR_ILLUSTRATIONS as ILL, LABOUR_VIEW_PERMS } from '../../constants/labour.constants';
import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import * as api from '../../api/labour.api';
import { LP } from '../../constants/labour.constants';
import { useCatalog, useContractorOptions, useLabourSettings, useLabourSites } from '../../hooks/useLabourLists';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import { usePagedList } from '../../hooks/usePagedList';
import type { AttendanceDay } from '../../types/labour.types';
import { daysAgo, fmtDate, fmtMinutes, fmtTime, titleCase, today } from '../../utils/format';
import { DateFilter, FilterBar, FilterGrid, FilterSelect, Gate, ListShell, PageHeader, Pill, SearchBox, secondaryBtn, td, th, trClickCls } from '../shared/Primitives';
import { DayPay } from './DayPay';
import { ExportDialog } from './ExportDialog';
import { PunchDrawer } from './PunchDrawer';

interface Filters extends Record<string, unknown> { search: string; from: string; to: string; siteId: number | null; contractorId: number | null; categoryId: number | null; status: string }
const INITIAL: Filters = { search: '', from: daysAgo(6), to: today(), siteId: null, contractorId: null, categoryId: null, status: '' };

export const DayStatusPill = ({ s }: { s: AttendanceDay['status'] }) => <Pill tone={s === 'incomplete' ? 'warn' : s === 'regularized' ? 'dark' : 'good'}>{titleCase(s)}</Pill>;

export function DaysPage() {
  const { enabled, canAny } = useLabourAccess();
  return <Gate enabled={enabled} allowed={canAny(LABOUR_VIEW_PERMS)} what="attendance"><Days /></Gate>;
}

function Days() {
  const { can } = useLabourAccess();
  const settings = useLabourSettings();
  const canRemovePunch = can(LP.REGULARIZE) && !!settings?.regularization.enabled && settings.regularization.allowRemovePunch !== false;
  const canSetHajri = can(LP.REGULARIZE) && !!settings?.regularization.enabled && settings.regularization.allowSetHajri !== false;
  const { sites, all } = useLabourSites();
  const contractors = useContractorOptions();
  const { categoryOptions, subcategoryOptions } = useCatalog();
  const list = usePagedList<AttendanceDay, Filters>((f, page, pageSize) => api.listDays({ ...f, siteId: f.siteId ?? undefined, contractorId: f.contractorId ?? undefined, categoryId: f.categoryId ?? undefined, status: f.status || undefined, search: f.search || undefined, from: f.from || undefined, to: f.to || undefined, page, pageSize }), INITIAL);
  const f = list.filters;
  const [open, setOpen] = useState<AttendanceDay | null>(null);
  const [exporting, setExporting] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Attendance days" description="One row per labourer per work day. Open a row to see every punch.">
        <button type="button" className={secondaryBtn} onClick={() => setExporting(true)}><Download className="h-3.5 w-3.5" aria-hidden />Export</button>
      </PageHeader>
      <FilterBar>
        <SearchBox value={list.searchInput} onChange={list.setSearchInput} placeholder="Search name or code…" />
        <FilterGrid>
          <DateFilter label="From" value={f.from} onChange={(from) => list.update({ from })} />
          <DateFilter label="To" value={f.to} onChange={(to) => list.update({ to })} />
          <SearchableFilterDropdown label="Site" allLabel="All sites" value={f.siteId} options={sites} onChange={(siteId) => list.update({ siteId })} className="md:w-44" />
          <SearchableFilterDropdown label="Contractor" allLabel="All contractors" value={f.contractorId} options={contractors} onChange={(contractorId) => list.update({ contractorId })} className="md:w-48" />
          <SearchableFilterDropdown label="Category" allLabel="All categories" value={f.categoryId} options={categoryOptions} onChange={(categoryId) => list.update({ categoryId })} className="md:w-44" />
          <FilterSelect label="Status" value={f.status} onChange={(status) => list.update({ status })} anyLabel="Any status" options={[{ value: 'present', label: 'Present' }, { value: 'incomplete', label: 'Incomplete' }, { value: 'regularized', label: 'Regularized' }]} />
        </FilterGrid>
      </FilterBar>
      <ListShell loading={list.initialLoading} fetching={list.fetching} error={list.error} empty={list.rows.length === 0} hasFilters={list.hasActiveFilters} onClear={list.clear}
        emptyIllustration={ILL.days} emptyTitle="No attendance in this range" emptyText="Try another date range or site." page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize}>
        <table className="hidden w-full border-separate border-spacing-0 md:table">
          <thead className="sticky top-0 z-10"><tr><th className={th}>Date</th><th className={th}>Labourer</th><th className={cx(th, 'hidden lg:table-cell')}>Contractor / site</th><th className={th}>In</th><th className={th}>Out</th><th className={`${th} text-right`}>Hours</th><th className={th}>Pay</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {list.rows.map((d) => (
              <tr key={d.id} tabIndex={0} onClick={() => setOpen(d)} onKeyDown={(e) => e.key === 'Enter' && setOpen(d)} className={trClickCls}>
                <td className={td}>{fmtDate(d.workDate)}</td>
                <td className={td}><div className="font-semibold text-fg">{d.name}</div><div className="text-[11px] text-fg-muted">{d.code}</div></td>
                <td className={cx(td, 'hidden lg:table-cell')}><div>{d.contractorName || '—'}</div><div className="text-[11px] text-fg-muted">{d.siteName || '—'}</div></td>
                <td className={td}>{fmtTime(d.firstIn)}</td>
                <td className={td}>{d.lastOut ? fmtTime(d.lastOut) : <span className="text-fg-muted">—</span>}</td>
                <td className={`${td} text-right tabular-nums`}>{fmtMinutes(d.workedMinutes)}</td>
                <td className={td}><DayPay d={d} compact /></td>
                <td className={td}><DayStatusPill s={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid gap-2 p-3 md:hidden">
          {list.rows.map((d) => (
            <button key={d.id} type="button" onClick={() => setOpen(d)} className="rounded-xl border border-line p-3 text-left active:bg-bg-subtle">
              <div className="flex items-start justify-between gap-2"><span className="font-semibold text-fg">{d.name}</span><DayStatusPill s={d.status} /></div>
              <div className="mt-0.5 text-xs text-fg-muted">{fmtDate(d.workDate)} · {fmtTime(d.firstIn)} – {d.lastOut ? fmtTime(d.lastOut) : 'open'} · {fmtMinutes(d.workedMinutes)}</div>
              <div className="mt-1 text-xs"><DayPay d={d} /></div>
            </button>
          ))}
        </div>
      </ListShell>
      <PunchDrawer day={open} onClose={() => setOpen(null)} canRemove={canRemovePunch} canSetHajri={canSetHajri} maxBackDays={settings?.regularization.maxBackDays} onChanged={list.refetch} />
      {exporting && (
        <ExportDialog defaults={{ siteId: f.siteId, contractorId: f.contractorId, categoryId: f.categoryId, from: f.from, to: f.to, search: f.search }}
          sites={sites} singleSite={!all} contractors={contractors} categoryOptions={categoryOptions} subcategoryOptions={subcategoryOptions} onClose={() => setExporting(false)} />
      )}
    </div>
  );
}
