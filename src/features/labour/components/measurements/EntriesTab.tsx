'use client';

import React, { useMemo, useState } from 'react';
import { CheckCheck, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { BULK_APPROVE_MAX, LABOUR_ILLUSTRATIONS as ILL, LP, MEAS_STATUSES, type MeasStatus } from '../../constants/labour.constants';
import { useContractorOptions, useLabourSites, useWorkItems } from '../../hooks/useLabourLists';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import { usePagedList } from '../../hooks/usePagedList';
import type { Labourer, Measurement, MeasurementTotals } from '../../types/labour.types';
import { daysAgo, fmtDate, money, today } from '../../utils/format';
import { DateFilter, FilterBar, FilterGrid, ListShell, Pill, primaryBtn, secondaryBtn, td, th, trClickCls } from '../shared/Primitives';
import { LabourerFilter } from './LabourerFilter';
import { EntryDrawer, type EntryDrawerTarget } from './EntryDrawer';
import { MeasStatusPill, QtyRate, whoLabel } from './MeasBits';

interface Filters extends Record<string, unknown> {
  search?: string; from: string; to: string; siteId: number | null; contractorId: number | null; labourer: Labourer | 'gang' | null; workItemId: number | null; status: MeasStatus | '';
}
const INITIAL: Filters = { from: daysAgo(30), to: today(), siteId: null, contractorId: null, labourer: null, workItemId: null, status: '' };

const selectable = (m: Measurement) => m.status === 'draft' || m.status === 'submitted';

export function EntriesTab() {
  const { can } = useLabourAccess();
  const canManage = can(LP.MEAS_MANAGE);
  const canApprove = can(LP.MEAS_APPROVE);
  const { sites } = useLabourSites();
  const contractors = useContractorOptions();
  const workItems = useWorkItems(true);
  const [totals, setTotals] = useState<MeasurementTotals | null>(null);
  const list = usePagedList<Measurement, Filters>(async (f, page, pageSize) => {
    const res = await api.listMeasurements({
      from: f.from || undefined, to: f.to || undefined, siteId: f.siteId ?? undefined, contractorId: f.contractorId ?? undefined,
      labourerId: f.labourer && f.labourer !== 'gang' ? f.labourer.id : undefined, gang: f.labourer === 'gang' || undefined,
      workItemId: f.workItemId ?? undefined, status: f.status || undefined, page, pageSize,
    });
    setTotals(res.totals || null);
    return res;
  }, INITIAL);
  const f = list.filters;
  const [drawer, setDrawer] = useState<EntryDrawerTarget | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const workItemOptions = useMemo(() => workItems.items.map((w) => ({ value: w.id, label: w.isActive ? w.name : `${w.name} (off)` })), [workItems.items]);

  const pageSelectable = list.rows.filter(selectable);
  const allOnPage = pageSelectable.length > 0 && pageSelectable.every((m) => selected.has(m.id));
  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else if (n.size < BULK_APPROVE_MAX) n.add(id); return n; });
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    if (allOnPage) pageSelectable.forEach((m) => n.delete(m.id)); else pageSelectable.forEach((m) => { if (n.size < BULK_APPROVE_MAX) n.add(m.id); });
    return n;
  });
  const refresh = () => { list.refetch(); };

  const bulkApprove = () => {
    const ids = [...selected];
    setConfirm({
      title: `Approve ${ids.length} entr${ids.length === 1 ? 'y' : 'ies'}?`,
      body: 'Approved entries are frozen and counted in the payable report. A mistake is fixed later with a correction entry.',
      cta: 'Approve',
      run: async () => {
        try {
          const r = await api.bulkApproveMeasurements(ids);
          const skipped = r.skipped?.length || 0;
          showSuccess(`${r.approved.length} approved${skipped ? `, ${skipped} skipped (already approved, rejected or not found)` : ''}`);
          setSelected(new Set());
          refresh();
        } catch (e) { showError(messageOf(e)); }
      },
    });
  };

  const statusCard = (value: MeasStatus | '', label: string) => {
    const t = !totals ? null : value ? totals[value] : {
      count: MEAS_STATUSES.reduce((a, x) => a + (totals[x.value]?.count || 0), 0),
      amount: (['draft', 'submitted', 'approved'] as const).reduce((a, k) => a + (totals[k]?.amount || 0), 0),
    };
    const on = f.status === value;
    return (
      <button key={value || 'all'} type="button" aria-pressed={on} onClick={() => list.update({ status: value })}
        className={cx('min-w-0 rounded-xl border p-3 text-left transition-colors', on ? 'border-[var(--tt-primary)] ring-1 ring-[var(--tt-primary)]' : 'border-line hover:bg-bg-subtle', 'bg-surface')}>
        <p className="truncate text-[11px] font-semibold text-fg-muted">{label}</p>
        <p className="mt-1 truncate text-lg font-extrabold tabular-nums text-fg">{t ? t.count : '—'}</p>
        <p className="truncate text-[11px] tabular-nums text-fg-muted">{t ? money(t.amount) : ''}{value === '' && t ? ' excl. rejected' : ''}</p>
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <FilterBar>
        <FilterGrid>
          <DateFilter label="From" value={f.from} onChange={(from) => list.update({ from })} />
          <DateFilter label="To" value={f.to} onChange={(to) => list.update({ to })} />
          <SearchableFilterDropdown label="Site" allLabel="All sites" value={f.siteId} options={sites} onChange={(siteId) => list.update({ siteId })} className="md:w-44" />
          <SearchableFilterDropdown label="Contractor" allLabel="All contractors" value={f.contractorId} options={contractors} onChange={(contractorId) => list.update({ contractorId })} className="md:w-48" />
          <LabourerFilter value={f.labourer} onChange={(labourer) => list.update({ labourer })} />
          <SearchableFilterDropdown label="Work item" allLabel="All work items" value={f.workItemId} options={workItemOptions} onChange={(workItemId) => list.update({ workItemId })} className="md:w-44" />
        </FilterGrid>
        <div className="flex flex-wrap gap-2 md:ml-auto">
          {canApprove && selected.size > 0 && <button type="button" className={primaryBtn} onClick={bulkApprove}><CheckCheck className="h-3.5 w-3.5" aria-hidden />Approve {selected.size}</button>}
          {canManage && <button type="button" className={canApprove && selected.size > 0 ? secondaryBtn : primaryBtn} onClick={() => setDrawer({ mode: 'new' })}><Plus className="h-3.5 w-3.5" aria-hidden />Add entry</button>}
        </div>
      </FilterBar>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {statusCard('', 'All')}
        {MEAS_STATUSES.map((s) => statusCard(s.value, s.label))}
      </div>

      <ListShell loading={list.initialLoading} fetching={list.fetching} error={list.error} empty={list.rows.length === 0} hasFilters={list.hasActiveFilters} onClear={() => { list.clear(); setSelected(new Set()); }}
        emptyIllustration={ILL.measurements} emptyTitle="No measurements in this period" emptyText="Record work done by measurement: a quantity at a rate, or a lump-sum job. Approved entries are paid in the payable report."
        emptyAction={canManage ? { label: 'Add entry', onClick: () => setDrawer({ mode: 'new' }) } : undefined}
        page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize}>
        <table className="hidden w-full border-separate border-spacing-0 md:table">
          <thead className="sticky top-0 z-10">
            <tr>
              {canApprove && <th className={cx(th, 'w-10')}><input type="checkbox" aria-label="Select every open entry on this page" checked={allOnPage} disabled={!pageSelectable.length} onChange={toggleAll} className="h-4 w-4 accent-[var(--tt-primary)]" /></th>}
              <th className={th}>Date</th><th className={th}>Work</th><th className={th}>Labourer</th><th className={cx(th, 'hidden lg:table-cell')}>Contractor / site</th><th className={th}>Quantity × rate</th><th className={cx(th, 'text-right')}>Amount</th><th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.rows.map((m) => (
              <tr key={m.id} tabIndex={0} onClick={() => setDrawer({ mode: 'view', id: m.id })} onKeyDown={(e) => e.key === 'Enter' && setDrawer({ mode: 'view', id: m.id })} className={trClickCls}>
                {canApprove && (
                  <td className={td} onClick={(e) => e.stopPropagation()}>
                    {selectable(m) && <input type="checkbox" aria-label={`Select entry ${m.id}`} checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="h-4 w-4 accent-[var(--tt-primary)]" />}
                  </td>
                )}
                <td className={td}>{fmtDate(m.workDate)}</td>
                <td className={td}>
                  <div className="font-semibold text-fg">{m.workItemName || `Item #${m.workItemId}`}</div>
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-fg-muted">
                    {m.adjustsId && <Pill>Correction of #{m.adjustsId}</Pill>}
                    {m.description && <span className="max-w-[16rem] truncate">{m.description}</span>}
                  </div>
                </td>
                <td className={td}>{whoLabel(m)}</td>
                <td className={cx(td, 'hidden lg:table-cell')}><div>{m.contractorName || '—'}</div><div className="text-[11px] text-fg-muted">{m.siteName || '—'}</div></td>
                <td className={td}><QtyRate m={m} /></td>
                <td className={cx(td, 'text-right font-semibold tabular-nums', m.amount < 0 && 'text-[var(--tt-danger)]')}>{money(m.amount)}</td>
                <td className={td}><MeasStatusPill s={m.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid gap-2 p-3 md:hidden">
          {list.rows.map((m) => (
            <div key={m.id} className="flex items-start gap-2 rounded-xl border border-line p-3">
              {canApprove && selectable(m) && <input type="checkbox" aria-label={`Select entry ${m.id}`} checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="mt-1 h-4 w-4 accent-[var(--tt-primary)]" />}
              <button type="button" onClick={() => setDrawer({ mode: 'view', id: m.id })} className="min-w-0 flex-1 text-left">
                <div className="flex items-start justify-between gap-2"><span className="font-semibold text-fg">{m.workItemName}</span><MeasStatusPill s={m.status} /></div>
                <div className="mt-0.5 text-xs text-fg-muted">{fmtDate(m.workDate)} · {whoLabel(m)} · {m.contractorName}</div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs"><QtyRate m={m} /><span className="font-bold tabular-nums">{money(m.amount)}</span></div>
              </button>
            </div>
          ))}
        </div>
      </ListShell>

      <EntryDrawer target={drawer} onClose={() => setDrawer(null)} onTarget={setDrawer} onChanged={refresh} sites={sites} contractors={contractors} workItems={workItems.items} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
