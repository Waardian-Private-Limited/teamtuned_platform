'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { RotateCcw, Search } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/theme/tokens';
import * as api from '../../shared/api/recruitment.api';
import {
  APPLICATION_STATUS_LABELS, SOURCE_LABELS, STAGES, STAGE_LABELS,
} from '../../shared/constants/recruitment.constants';
import { toPaged, toPosition } from '../../shared/types/recruitment.mapper';
import type { ApplicationStatus, Source } from '../../shared/types/recruitment.model';
import { CandidateDrawerHost } from '../../interviews/components/CandidateDrawerHost';
import { useApplicationList } from '../hooks/useApplicationList';
import { CandidatesCardList, CandidatesSkeleton, CandidatesTable } from './CandidatesTable';

function FilterSelect({ label, value, onChange, options, allLabel }: {
  label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; allLabel: string;
}) {
  return (
    <label className={cx(
      'relative flex h-9 items-center rounded-lg border bg-surface px-2.5 text-xs font-semibold text-fg transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:text-sm',
      value ? 'border-[var(--tt-primary)]/40' : 'border-line'
    )}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 cursor-pointer border-none bg-transparent pr-1 outline-none focus:ring-0">
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function CandidatesPage() {
  const params = useSearchParams();
  const initialPosition = Number(params?.get('position_id')) || null;
  const initialStage = params?.get('stage') || '';
  const list = useApplicationList({ positionId: initialPosition, stage: (STAGES as readonly string[]).includes(initialStage) ? initialStage : '' });
  const [openApp, setOpenApp] = React.useState<number | null>(null);
  const [positions, setPositions] = React.useState<Array<{ value: number; label: string }>>([]);

  React.useEffect(() => {
    api.listPositions({ pageSize: 100 })
      .then((dto) => setPositions(toPaged(dto, toPosition).items.map((p) => ({ value: p.id, label: p.title }))))
      .catch(() => {});
  }, []);

  const { filters, setFilter } = list;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 xl:flex-row xl:items-center xl:justify-between xl:gap-4 2xl:p-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Candidates</h1>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-muted">{list.total}</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-52 xl:w-60">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input
              value={list.searchInput}
              onChange={(e) => list.setSearchInput(e.target.value)}
              placeholder="Name, email or phone…"
              aria-label="Search candidates"
              className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm"
            />
          </div>
          <SearchableFilterDropdown label="Position" allLabel="All positions" value={filters.positionId} options={positions} onChange={(v) => setFilter('positionId', v)} />
          <FilterSelect label="Stage" allLabel="All stages" value={filters.stage} onChange={(v) => setFilter('stage', v)}
            options={STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))} />
          <FilterSelect label="Status" allLabel="Any status" value={filters.status} onChange={(v) => setFilter('status', v)}
            options={(Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).map((s) => ({ value: s, label: APPLICATION_STATUS_LABELS[s] }))} />
          <FilterSelect label="Source" allLabel="All sources" value={filters.source} onChange={(v) => setFilter('source', v)}
            options={(Object.keys(SOURCE_LABELS) as Source[]).map((s) => ({ value: s, label: SOURCE_LABELS[s] }))} />
          <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm">
            <Switch checked={filters.ownerMe} onChange={(v) => setFilter('ownerMe', v)} label="Assigned to me" />
            Owned by me
          </label>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && <div className="border-b border-line p-3"><Alert message={list.error} tone="error" /></div>}
        {list.isInitialLoading ? (
          <CandidatesSkeleton />
        ) : list.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center lg:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vectors/teams.svg" alt="" width={960} height={667} className="mb-4 h-auto w-36 select-none object-contain sm:w-44 lg:w-52" />
            <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg">
              {list.forbidden ? 'No access to candidates' : list.hasActiveFilters ? 'No matching candidates' : 'No candidates yet'}
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-fg-muted sm:text-sm">
              {list.forbidden
                ? 'Candidate lists need recruitment access. Hiring managers can open their positions from Positions.'
                : list.hasActiveFilters
                  ? 'Try clearing the filters. Rejected and hired candidates are hidden unless you change Status.'
                  : 'Applications from the careers page, referrals and candidates you add show up here.'}
            </p>
            {list.hasActiveFilters && !list.forbidden && (
              <button type="button" onClick={list.clearFilters} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm">
                <RotateCcw className="h-3.5 w-3.5 text-fg-muted" />Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <CandidatesTable items={list.items} onOpen={(a) => setOpenApp(a.id)} />
            </div>
            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden transition-opacity md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <CandidatesCardList items={list.items} onOpen={(a) => setOpenApp(a.id)} />
            </div>
            {list.total > 0 && (
              <div className="border-t border-line bg-surface px-4 py-2.5">
                <Pagination
                  currentPage={list.page}
                  totalPages={list.totalPages}
                  totalItems={list.total}
                  pageSize={list.pageSize}
                  onPageChange={list.setPage}
                  onPageSizeChange={list.setPageSize}
                />
              </div>
            )}
          </>
        )}
      </div>

      <CandidateDrawerHost applicationId={openApp} onClose={() => setOpenApp(null)} onChanged={() => list.refetch()} />
    </div>
  );
}
