'use client';

import React, { useState } from 'react';
import { Layers, Pencil, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, FieldLabel, SelectField, TextField } from '@/components/ui/FormControls';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { Switch } from '@/components/ui/Switch';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { LABOUR_ILLUSTRATIONS as ILL, LP, WORK_UNITS } from '../../constants/labour.constants';
import { useCatalog } from '../../hooks/useLabourLists';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import { usePagedList } from '../../hooks/usePagedList';
import type { WorkItem, WorkItemBody } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { money } from '../../utils/format';
import { FilterBar, FilterGrid, FormError, ListShell, Pill, SearchBox, primaryBtn, secondaryBtn, td, th, trCls } from '../shared/Primitives';
import { RateOverridesDrawer } from './RateOverridesDrawer';

interface Filters extends Record<string, unknown> { search: string; categoryId: number | null; includeInactive: boolean }
const INITIAL: Filters = { search: '', categoryId: null, includeInactive: false };

/** The organization's work item catalogue: unit, default rate, lump sum; dated rate overrides per item. */
export function WorkItemsTab() {
  const { can } = useLabourAccess();
  const canEdit = can(LP.CONTRACTORS);
  const { categoryOptions } = useCatalog();
  const list = usePagedList<WorkItem, Filters>((f, page, pageSize) => api.listWorkItems({ search: f.search || undefined, categoryId: f.categoryId ?? undefined, includeInactive: f.includeInactive || undefined, page, pageSize }), INITIAL);
  const f = list.filters;
  const [dialog, setDialog] = useState<WorkItem | 'new' | null>(null);
  const [rates, setRates] = useState<WorkItem | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <FilterBar>
        <SearchBox value={list.searchInput} onChange={list.setSearchInput} placeholder="Search work items…" />
        <FilterGrid>
          <SearchableFilterDropdown label="Category" allLabel="All categories" value={f.categoryId} options={categoryOptions} onChange={(categoryId) => list.update({ categoryId })} className="md:w-44" />
          <label className="flex items-center gap-2 text-xs font-semibold text-fg-muted">Show switched off<Switch label="Show switched-off work items" checked={f.includeInactive} onChange={(includeInactive) => list.update({ includeInactive })} /></label>
        </FilterGrid>
        {canEdit && <div className="md:ml-auto"><button type="button" className={primaryBtn} onClick={() => setDialog('new')}><Plus className="h-3.5 w-3.5" aria-hidden />Add work item</button></div>}
      </FilterBar>
      <ListShell loading={list.initialLoading} fetching={list.fetching} error={list.error} empty={list.rows.length === 0} hasFilters={list.hasActiveFilters} onClear={list.clear}
        emptyIllustration={ILL.workItems} emptyTitle="No work items yet" emptyText="List the work you pay by measurement: shuttering per sq m, plaster per sq ft, a lump-sum job. Each has a default rate and dated overrides."
        emptyAction={canEdit ? { label: 'Add work item', onClick: () => setDialog('new') } : undefined}
        page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize}>
        <table className="hidden w-full border-separate border-spacing-0 md:table">
          <thead className="sticky top-0 z-10"><tr><th className={th}>Work item</th><th className={th}>Unit</th><th className={cx(th, 'text-right')}>Default rate</th><th className={th}>Category</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {list.rows.map((w) => (
              <tr key={w.id} className={cx(trCls, w.isActive ? '' : 'text-fg-muted')}>
                <td className={td}><div className="font-semibold text-fg">{w.name}</div>{w.isLumpSum && <Pill>Lump sum</Pill>}</td>
                <td className={td}>{w.isLumpSum ? 'job' : w.unit}</td>
                <td className={cx(td, 'text-right tabular-nums')}>{w.defaultRate > 0 ? <>{money(w.defaultRate)}<span className="text-[11px] text-fg-muted"> {w.isLumpSum ? 'per job' : `/ ${w.unit}`}</span></> : <span className="text-fg-muted">Not set</span>}</td>
                <td className={td}>{w.categoryName || <span className="text-fg-muted">Any</span>}</td>
                <td className={td}><Pill tone={w.isActive ? 'good' : 'neutral'}>{w.isActive ? 'Active' : 'Off'}</Pill></td>
                <td className={cx(td, 'text-right')}>
                  <div className="flex justify-end gap-1.5">
                    <button type="button" className={cx(secondaryBtn, 'h-8')} onClick={() => setRates(w)}><Layers className="h-3.5 w-3.5" aria-hidden />Rate overrides</button>
                    {canEdit && <button type="button" aria-label={`Edit ${w.name}`} className={cx(secondaryBtn, 'h-8')} onClick={() => setDialog(w)}><Pencil className="h-3.5 w-3.5" aria-hidden /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid gap-2 p-3 md:hidden">
          {list.rows.map((w) => (
            <div key={w.id} className="rounded-xl border border-line p-3">
              <div className="flex items-start justify-between gap-2"><span className="font-semibold text-fg">{w.name}</span><Pill tone={w.isActive ? 'good' : 'neutral'}>{w.isActive ? 'Active' : 'Off'}</Pill></div>
              <div className="mt-0.5 text-xs text-fg-muted">{w.isLumpSum ? 'Lump sum' : w.unit} · {w.defaultRate > 0 ? money(w.defaultRate) : 'no default rate'} · {w.categoryName || 'any category'}</div>
              <div className="mt-2 flex gap-1.5">
                <button type="button" className={cx(secondaryBtn, 'h-8')} onClick={() => setRates(w)}><Layers className="h-3.5 w-3.5" aria-hidden />Rate overrides</button>
                {canEdit && <button type="button" className={cx(secondaryBtn, 'h-8')} onClick={() => setDialog(w)}><Pencil className="h-3.5 w-3.5" aria-hidden />Edit</button>}
              </div>
            </div>
          ))}
        </div>
      </ListShell>
      {dialog && <WorkItemDialog item={dialog === 'new' ? null : dialog} categoryOptions={categoryOptions} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); list.refetch(); }} />}
      <RateOverridesDrawer item={rates} canEdit={canEdit} onClose={() => setRates(null)} />
    </div>
  );
}

const KNOWN = ['name', 'unit', 'defaultRate', 'categoryId', 'isLumpSum'];

function WorkItemDialog({ item, categoryOptions, onClose, onSaved }: { item: WorkItem | null; categoryOptions: Array<{ value: number; label: string }>; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name || '');
  const [isLumpSum, setLumpSum] = useState(item?.isLumpSum || false);
  const [unit, setUnit] = useState(item && !item.isLumpSum ? item.unit : '');
  const [defaultRate, setDefaultRate] = useState(item && item.defaultRate > 0 ? String(item.defaultRate) : '');
  const [categoryId, setCategoryId] = useState<number | null>(item?.categoryId ?? null);
  const [isActive, setActive] = useState(item?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const clear = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: '' } : e));

  const save = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Enter the name';
    if (!isLumpSum && !unit.trim()) e.unit = 'Choose or type the unit';
    if (unit.trim().length > 20) e.unit = 'At most 20 characters';
    const rate = defaultRate.trim() === '' ? 0 : Number(defaultRate);
    if (!Number.isFinite(rate) || rate < 0) e.defaultRate = 'Enter an amount, or leave it empty';
    setErrors(e);
    setFormError('');
    if (Object.values(e).some(Boolean)) return;
    const body: WorkItemBody = { name: name.trim(), isLumpSum, ...(isLumpSum ? {} : { unit: unit.trim() }), defaultRate: rate, categoryId, ...(item ? { isActive } : {}) };
    setBusy(true);
    try {
      if (item) await api.updateWorkItem(item.id, body); else await api.createWorkItem(body);
      showSuccess(item ? 'Work item saved' : 'Work item added');
      onSaved();
    } catch (err) {
      const p = placeError(err, (f) => KNOWN.includes(f));
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={item ? 'Edit work item' : 'Add work item'} maxWidthClassName="max-w-lg"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="space-y-4">
        <TextField label="Name" required maxLength={120} value={name} error={errors.name} onChange={(v) => { setName(v); clear('name'); }} placeholder="e.g. Slab shuttering" />
        <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
          <span><span className="block text-sm font-semibold text-fg">Lump sum</span><span className="block text-[11px] text-fg-muted">“Do this job for ₹X”: paid the agreed amount, unit “job”.</span></span>
          <Switch label="Lump sum" checked={isLumpSum} onChange={(v) => { setLumpSum(v); clear('unit'); }} />
        </label>
        {!isLumpSum && (
          <div>
            <TextField label="Unit" required maxLength={20} value={unit} error={errors.unit} onChange={(v) => { setUnit(v); clear('unit'); }} placeholder="sq m" />
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Common units">
              {WORK_UNITS.filter((u) => u !== 'job').map((u) => <Chip key={u} active={unit === u} onClick={() => { setUnit(u); clear('unit'); }}>{u}</Chip>)}
            </div>
          </div>
        )}
        <TextField label={isLumpSum ? 'Default agreed amount (per job)' : `Default rate${unit ? ` per ${unit}` : ''}`} prefix="₹" inputMode="decimal" value={defaultRate} error={errors.defaultRate} onChange={(v) => { setDefaultRate(v); clear('defaultRate'); }}
          hint={item ? 'A new default only applies to entries made later; entries keep the rate they were made with.' : 'Optional. Overrides by site, contractor or labourer can be dated per item.'} />
        <SelectField label="Category" numeric value={categoryId} options={categoryOptions} placeholder="Any category" error={errors.categoryId} onChange={setCategoryId} />
        {item && (
          <div>
            <FieldLabel label="Status" />
            <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-sm">
              <span>{isActive ? 'Active: can be picked for new entries' : 'Off: hidden from new entries (old entries keep it)'}</span>
              <Switch label="Active" checked={isActive} onChange={setActive} />
            </label>
          </div>
        )}
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
