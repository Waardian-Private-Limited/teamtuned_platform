'use client';

import { useState } from 'react';
import { FileUp, Plus, RotateCcw, Search } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/theme/tokens';
import { useRecruitmentAccess } from '../../shared/hooks/useRecruitmentAccess';
import { LEAD_STATUS_LABELS, LEAD_TABS, SORT_LABELS } from '../constants/pool.constants';
import { usePoolList } from '../hooks/usePoolList';
import type { PoolSort, PoolTab } from '../types/pool.types';
import { AddLeadDialog } from './AddLeadDialog';
import { ImportPoolDialog } from './ImportPoolDialog';
import { PoolDrawer } from './PoolDrawer';
import { PoolCardList, PoolSkeleton, PoolTable } from './PoolTable';

function Tab({ active, onClick, label, count, alert }: { active: boolean; onClick: () => void; label: string; count?: number; alert?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors',
        active ? 'border-fg bg-fg text-bg' : 'border-line bg-surface text-fg hover:bg-bg-subtle'
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cx('tabular-nums', active ? 'text-bg/70' : alert && count > 0 ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>{count}</span>
      )}
    </button>
  );
}

const select = 'h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg outline-none focus:border-[var(--tt-primary)] sm:text-sm';

/**
 * Talent pool & leads: every past candidate, imported record and lead in one place, to reuse for new
 * positions and to follow leads up by phone until they move into a position.
 */
export function TalentPoolPage() {
  const access = useRecruitmentAccess();
  const list = usePoolList();
  const [openId, setOpenId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const counts = list.data?.counts;
  const items = list.data?.items || [];
  const { query } = list;

  const tabs: Array<{ value: PoolTab; label: string; count?: number; alert?: boolean }> = [
    { value: '', label: 'Everyone', count: counts?.all },
    { value: 'due', label: 'Follow-up due', count: counts?.followUpDue, alert: true },
    { value: 'leads', label: 'All leads', count: counts?.leads },
    ...LEAD_TABS.filter((s) => (counts?.[s] || 0) > 0 || query.tab === s).map((s) => ({ value: s as PoolTab, label: LEAD_STATUS_LABELS[s], count: counts?.[s] })),
    { value: 'records', label: 'Past records', count: counts?.records },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Talent pool</h1>
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-muted">{list.data?.total ?? '…'}</span>
          </div>
          {access.canManage && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setImporting(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg shadow-xs hover:bg-bg-subtle sm:text-sm">
                <FileUp className="h-3.5 w-3.5" />Import
              </button>
              <button type="button" onClick={() => setAdding(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs hover:bg-[var(--tt-primary-hover)] sm:text-sm">
                <Plus className="h-3.5 w-3.5" />Add lead
              </button>
            </div>
          )}
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 tt-scroll-hidden">
          {tabs.map((t) => <Tab key={t.value || 'all'} active={query.tab === t.value} onClick={() => list.setTab(t.value)} label={t.label} count={t.count} alert={t.alert} />)}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-64 xl:w-80">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input
              value={list.searchInput}
              onChange={(e) => list.setSearchInput(e.target.value)}
              placeholder="Name, phone, title, skills, city…"
              aria-label="Search the talent pool"
              className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm"
            />
          </div>
          {(list.data?.leadSources.length || 0) > 0 && (
            <select aria-label="Source" value={query.leadSource} onChange={(e) => list.setLeadSource(e.target.value)} className={cx(select, query.leadSource && 'border-fg/30')}>
              <option value="">All sources</option>
              {list.data!.leadSources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select aria-label="Sort" value={query.sort} onChange={(e) => list.setSort(e.target.value as PoolSort)} className={select}>
            {(Object.keys(SORT_LABELS) as PoolSort[]).map((s) => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}
          </select>
          <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm">
            <Switch checked={query.mine} onChange={list.setMine} label="Only my leads" />
            Mine
          </label>
          {list.filtered && (
            <button type="button" onClick={list.clear} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-fg sm:text-sm">
              <RotateCcw className="h-3.5 w-3.5" />Clear
            </button>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && <div className="border-b border-line p-3"><Alert message={list.error} tone="error" /></div>}
        {list.loading ? (
          <div className="flex-1 overflow-hidden"><PoolSkeleton /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center lg:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vectors/employees.svg" alt="" width={960} height={667} className="mb-4 h-auto w-36 select-none object-contain sm:w-44" />
            <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base">{list.filtered ? 'Nobody matches' : 'Build your talent pool'}</h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-fg-muted sm:text-sm">
              {list.filtered
                ? 'Try other words or clear the filters.'
                : 'Everyone who applies lands here. Import candidates from earlier hiring, or add leads from calls, walk-ins and job boards.'}
            </p>
            {!list.filtered && access.canManage && (
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setImporting(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm"><FileUp className="h-3.5 w-3.5" />Import a file</button>
                <button type="button" onClick={() => setAdding(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] sm:text-sm"><Plus className="h-3.5 w-3.5" />Add lead</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity md:block', list.refreshing ? 'opacity-75' : 'opacity-100')}>
              <PoolTable items={items} onOpen={(i) => setOpenId(i.id)} />
            </div>
            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden transition-opacity md:hidden', list.refreshing ? 'opacity-75' : 'opacity-100')}>
              <PoolCardList items={items} onOpen={(i) => setOpenId(i.id)} />
            </div>
            <div className="border-t border-line bg-surface px-4 py-2.5">
              <Pagination
                currentPage={query.page}
                totalPages={list.data?.pages || 1}
                totalItems={list.data?.total || 0}
                pageSize={query.pageSize}
                onPageChange={list.setPage}
                onPageSizeChange={list.setPageSize}
              />
            </div>
          </>
        )}
      </div>

      <PoolDrawer candidateId={openId} canManage={access.canManage} onClose={() => setOpenId(null)} onChanged={list.reload} />
      <AddLeadDialog
        open={adding}
        sources={list.data?.leadSources || []}
        onClose={() => setAdding(false)}
        onAdded={(id) => { setAdding(false); list.reload(); setOpenId(id); }}
        onOpenExisting={(id) => { setAdding(false); setOpenId(id); }}
      />
      <ImportPoolDialog open={importing} onClose={() => setImporting(false)} onImported={list.reload} />
    </div>
  );
}
