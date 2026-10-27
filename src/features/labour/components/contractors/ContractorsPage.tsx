'use client';

import { LABOUR_ILLUSTRATIONS as ILL, LABOUR_VIEW_PERMS } from '../../constants/labour.constants';
import { useLabourSites } from '../../hooks/useLabourLists';
import React, { useState } from 'react';
import { GitMerge, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import * as api from '../../api/labour.api';
import { LP } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import { usePagedList } from '../../hooks/usePagedList';
import type { Contractor } from '../../types/labour.types';
import { fmtDate } from '../../utils/format';
import { FilterBar, FilterGrid, FilterSelect, Gate, ListShell, PageHeader, Pill, SearchBox, primaryBtn, secondaryBtn, td, th, trClickCls } from '../shared/Primitives';
import { ContractorDrawer } from './ContractorDrawer';
import { MergeDialog } from './MergeDialog';

interface Filters extends Record<string, unknown> { search: string; status: string; siteId: number | null }
const INITIAL: Filters = { search: '', status: '', siteId: null };

export function ContractorsPage() {
  const { enabled, canAny } = useLabourAccess();
  return <Gate enabled={enabled} allowed={canAny(LABOUR_VIEW_PERMS)} what="contractors"><Contractors /></Gate>;
}

function Contractors() {
  const { can } = useLabourAccess();
  const canManage = can(LP.CONTRACTORS);
  const { sites } = useLabourSites();
  const list = usePagedList<Contractor, Filters>((f, page, pageSize) => api.listContractors({ search: f.search || undefined, status: f.status || undefined, siteId: f.siteId ?? undefined, page, pageSize }), INITIAL);
  const [drawer, setDrawer] = useState<number | 'new' | null>(null);
  const [merge, setMerge] = useState<{ id: number; name: string } | null>(null);
  const f = list.filters;
  const licenceLabel = (c: Contractor) => (c.clraLicenceNo ? `${c.clraLicenceNo}${c.clraValidTo ? ` · till ${fmtDate(c.clraValidTo)}` : ''}` : '—');

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Contractors" description="Labour contractors, their licences, documents and rates.">
        {canManage && <button type="button" className={primaryBtn} onClick={() => setDrawer('new')}><Plus className="h-3.5 w-3.5" aria-hidden />Add contractor</button>}
      </PageHeader>
      <FilterBar>
        <SearchBox value={list.searchInput} onChange={list.setSearchInput} placeholder="Search name, code, GSTIN…" />
        <FilterGrid>
          <SearchableFilterDropdown label="Site" allLabel="All sites" value={f.siteId} options={sites} onChange={(siteId) => list.update({ siteId })} className="md:w-44" />
          <FilterSelect label="Status" value={f.status} onChange={(status) => list.update({ status })} anyLabel="Any status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'merged', label: 'Merged' }]} />
        </FilterGrid>
      </FilterBar>
      <ListShell loading={list.initialLoading} fetching={list.fetching} error={list.error} empty={list.rows.length === 0} hasFilters={list.hasActiveFilters} onClear={list.clear}
        emptyIllustration={ILL.contractors} emptyTitle="No contractors yet" emptyText="Add a contractor to start registering labour." emptyAction={canManage ? { label: 'Add contractor', onClick: () => setDrawer('new') } : undefined}
        page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize}>
        <table className="hidden w-full border-separate border-spacing-0 md:table">
          <thead className="sticky top-0 z-10"><tr><th className={th}>Contractor</th><th className={th}>Contact</th><th className={cx(th, 'hidden lg:table-cell')}>CLRA licence</th><th className={cx(th, 'text-right')}>Labourers</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {list.rows.map((c) => (
              <tr key={c.id} tabIndex={0} onClick={() => setDrawer(c.id)} onKeyDown={(e) => e.key === 'Enter' && setDrawer(c.id)} className={trClickCls}>
                <td className={td}><div className="font-semibold text-fg">{c.legalName}</div><div className="text-[11px] text-fg-muted">{[c.code, c.tradeName].filter(Boolean).join(' · ')}</div></td>
                <td className={td}>{[c.contactPerson, c.phone].filter(Boolean).join(' · ') || '—'}</td>
                <td className={cx(td, 'hidden lg:table-cell')}>{licenceLabel(c)}</td>
                <td className={cx(td, 'text-right tabular-nums')}>{c.labourCount}</td>
                <td className={td}><Pill tone={c.status === 'active' ? 'good' : 'neutral'}>{c.status}</Pill></td>
                <td className={cx(td, 'text-right')}>
                  {canManage && c.status === 'active' && <button type="button" onClick={(e) => { e.stopPropagation(); setMerge({ id: c.id, name: c.tradeName || c.legalName }); }} className={cx(secondaryBtn, 'h-8')}><GitMerge className="h-3.5 w-3.5" aria-hidden />Merge</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid gap-2 p-3 md:hidden">
          {list.rows.map((c) => (
            <button key={c.id} type="button" onClick={() => setDrawer(c.id)} className="rounded-xl border border-line p-3 text-left active:bg-bg-subtle">
              <div className="flex items-start justify-between gap-2"><span className="font-semibold text-fg">{c.legalName}</span><Pill tone={c.status === 'active' ? 'good' : 'neutral'}>{c.status}</Pill></div>
              <div className="mt-0.5 text-xs text-fg-muted">{c.labourCount} labourers · {c.phone || 'No phone'}</div>
            </button>
          ))}
        </div>
      </ListShell>
      <ContractorDrawer open={drawer !== null} id={drawer} onClose={() => setDrawer(null)} canManage={canManage} onChanged={list.refetch} onMerge={(c) => { setDrawer(null); setMerge(c); }} onCreated={(id) => setDrawer(id)} />
      {merge && <MergeDialog source={merge} onClose={() => setMerge(null)} onMerged={() => { setMerge(null); list.refetch(); }} />}
    </div>
  );
}
