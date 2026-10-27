'use client';

import { LABOUR_ILLUSTRATIONS as ILL, LABOUR_FORMS_PERMS, LABOUR_VIEW_PERMS } from '../../constants/labour.constants';
import React, { useState } from 'react';
import { FileDown, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import * as api from '../../api/labour.api';
import { LP } from '../../constants/labour.constants';
import { useCatalog, useContractorOptions, useLabourSites } from '../../hooks/useLabourLists';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import { usePagedList } from '../../hooks/usePagedList';
import type { Labourer } from '../../types/labour.types';
import { fullName, titleCase } from '../../utils/format';
import { FilterBar, FilterGrid, FilterSelect, Gate, ListShell, PageHeader, Pill, SearchBox, primaryBtn, secondaryBtn, td, th, trClickCls } from '../shared/Primitives';
import { LabourerDrawer } from './LabourerDrawer';
import { LabourerWizard } from './LabourerWizard';
import type { StepId } from './wizard/wizard.types';
import { FormsPdfDialog } from './FormsPdfDialog';

interface Filters extends Record<string, unknown> {
  search: string; siteId: number | null; contractorId: number | null; categoryId: number | null; subcategoryId: number | null;
  status: string; faceStatus: string; forms: string;
}
const INITIAL: Filters = { search: '', siteId: null, contractorId: null, categoryId: null, subcategoryId: null, status: '', faceStatus: '', forms: '' };

export function FaceBadge({ l }: { l: Pick<Labourer, 'faceStatus' | 'needsReregistration'> }) {
  if (l.needsReregistration) return <Pill tone="warn">Re-register</Pill>;
  const map = { enrolled: ['good', 'Registered'], pending: ['neutral', 'Finishing'], failed: ['bad', 'Failed'], none: ['neutral', 'No face'] } as const;
  const [tone, label] = map[l.faceStatus] || map.none;
  return <Pill tone={tone}>{label}</Pill>;
}

export function LabourersPage() {
  const { enabled, canAny } = useLabourAccess();
  return (
    <Gate enabled={enabled} allowed={canAny(LABOUR_VIEW_PERMS)} what="labourers">
      <Labourers />
    </Gate>
  );
}

function Labourers() {
  const { can, canAny } = useLabourAccess();
  const canManage = can(LP.MANAGE);
  const canForms = canAny(LABOUR_FORMS_PERMS);
  const { sites } = useLabourSites();
  const contractors = useContractorOptions();
  const { categoryOptions, subcategoryOptions } = useCatalog();
  const list = usePagedList<Labourer, Filters>(
    (f, page, pageSize) => api.listLabourers({ ...f, siteId: f.siteId ?? undefined, contractorId: f.contractorId ?? undefined, categoryId: f.categoryId ?? undefined, subcategoryId: f.subcategoryId ?? undefined, status: f.status || undefined, faceStatus: f.faceStatus || undefined, complianceIncomplete: f.forms === 'incomplete' ? 'true' : undefined, search: f.search || undefined, page, pageSize }),
    INITIAL
  );
  const f = list.filters;
  const [wizard, setWizard] = useState<{ editId: number | null; startAt?: StepId } | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [pdf, setPdf] = useState(false);
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 200 ? p : [...p, id]));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Labourers" description="Everyone working through your contractors, with their face registration status.">
        {canForms && picked.length > 1 && <button type="button" className={secondaryBtn} onClick={() => setPdf(true)}><FileDown className="h-3.5 w-3.5" aria-hidden />Form PDF for {picked.length}</button>}
        {canManage && (
          <button type="button" className={primaryBtn} onClick={() => setWizard({ editId: null })}>
            <Plus className="h-3.5 w-3.5" aria-hidden />Add labourer
          </button>
        )}
      </PageHeader>

      <FilterBar>
        <SearchBox value={list.searchInput} onChange={list.setSearchInput} placeholder="Search name, code, phone…" />
        <FilterGrid>
          <SearchableFilterDropdown label="Site" allLabel="All sites" value={f.siteId} options={sites} onChange={(siteId) => list.update({ siteId })} className="md:w-44" />
          <SearchableFilterDropdown label="Contractor" allLabel="All contractors" value={f.contractorId} options={contractors} onChange={(contractorId) => list.update({ contractorId })} className="md:w-48" />
          <SearchableFilterDropdown label="Category" allLabel="All categories" value={f.categoryId} options={categoryOptions} onChange={(categoryId) => list.update({ categoryId, subcategoryId: null })} className="md:w-44" />
          {f.categoryId && <SearchableFilterDropdown label="Subcategory" allLabel="All subcategories" value={f.subcategoryId} options={subcategoryOptions(f.categoryId)} onChange={(subcategoryId) => list.update({ subcategoryId })} className="md:w-44" />}
          <FilterSelect label="Status" value={f.status} onChange={(status) => list.update({ status })} anyLabel="Any status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'left', label: 'Left' }]} />
          <FilterSelect label="Face status" value={f.faceStatus} onChange={(faceStatus) => list.update({ faceStatus })} anyLabel="Any face status" options={[{ value: 'enrolled', label: 'Registered' }, { value: 'pending', label: 'Finishing' }, { value: 'failed', label: 'Failed' }, { value: 'none', label: 'No face' }]} />
          <FilterSelect label="Forms" value={f.forms} onChange={(forms) => list.update({ forms })} anyLabel="Any forms" options={[{ value: 'incomplete', label: 'Details missing' }]} />
        </FilterGrid>
      </FilterBar>

      <ListShell
        loading={list.initialLoading} fetching={list.fetching} error={list.error} empty={list.rows.length === 0}
        hasFilters={list.hasActiveFilters} onClear={list.clear}
        emptyIllustration={ILL.labourers} emptyTitle="No labourers yet" emptyText="Add the first labourer to start recording attendance."
        emptyAction={canManage ? { label: 'Add labourer', onClick: () => setWizard({ editId: null }) } : undefined}
        page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize}
      >
        <table className="hidden w-full border-separate border-spacing-0 md:table">
          <thead className="sticky top-0 z-10">
            <tr>{canForms && <th className={cx(th, 'w-10')}><span className="sr-only">Select</span></th>}<th className={th}>Labourer</th><th className={th}>Contractor</th><th className={th}>Site</th><th className={cx(th, 'hidden lg:table-cell')}>Category</th><th className={th}>Face</th><th className={th}>Status</th></tr>
          </thead>
          <tbody>
            {list.rows.map((l) => (
              <tr key={l.id} tabIndex={0} onClick={() => setOpenId(l.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(l.id)} className={trClickCls}>
                {canForms && <td className={td} onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${fullName(l)}`} checked={picked.includes(l.id)} onChange={() => toggle(l.id)} className="h-4 w-4 accent-[var(--tt-primary)]" /></td>}
                <td className={td}><div className="font-semibold text-fg">{fullName(l)}</div><div className="text-[11px] text-fg-muted">{l.code}{l.phone ? ` · ${l.phone}` : ''}{l.complianceGapCount ? ` · ${l.complianceGapCount} form details missing` : ''}{l.machinePending ? ' · not on all machines yet' : ''}</div></td>
                <td className={td}>{l.contractorName || '—'}</td>
                <td className={td}>{l.siteName || '—'}</td>
                <td className={cx(td, 'hidden lg:table-cell')}>{[l.categoryName, l.subcategoryName].filter(Boolean).join(' / ') || '—'}</td>
                <td className={td}><FaceBadge l={l} /></td>
                <td className={td}><Pill tone={l.status === 'active' ? 'good' : 'neutral'}>{titleCase(l.status)}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid gap-2 p-3 md:hidden">
          {list.rows.map((l) => (
            <button key={l.id} type="button" onClick={() => setOpenId(l.id)} className="rounded-xl border border-line p-3 text-left active:bg-bg-subtle">
              <div className="flex items-start justify-between gap-2"><span className="font-semibold text-fg">{fullName(l)}</span><Pill tone={l.status === 'active' ? 'good' : 'neutral'}>{titleCase(l.status)}</Pill></div>
              <div className="mt-0.5 text-xs text-fg-muted">{l.code} · {l.contractorName || 'No contractor'} · {l.siteName || 'No site'}</div>
              <div className="mt-2"><FaceBadge l={l} /></div>
            </button>
          ))}
        </div>
      </ListShell>

      <LabourerDrawer id={openId} onClose={() => setOpenId(null)} canManage={canManage} canForms={canForms} onEdit={(id, startAt) => { setOpenId(null); setWizard({ editId: id, startAt }); }} onChanged={list.refetch} />
      {pdf && <FormsPdfDialog labourerIds={picked} onClose={() => setPdf(false)} />}
      {wizard && <LabourerWizard open onClose={() => setWizard(null)} editId={wizard.editId} startAt={wizard.startAt} onSaved={() => list.refetch()} onOpenExisting={(id) => { setWizard(null); setOpenId(id); }} />}
    </div>
  );
}
