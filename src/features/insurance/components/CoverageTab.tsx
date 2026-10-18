'use client';

import React from 'react';
import { Download, Plus, Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { ILLUSTRATIONS, PAGE_SIZE, SEARCH_DEBOUNCE_MS, STATUS_TABS } from '../constants/insurance.constants';
import { useDebounced } from '../hooks/useDebounced';
import { useEnrollments, usePlans } from '../hooks/useInsuranceData';
import type { CoverFilters, CoverStatus } from '../types/insurance.types';
import { day, money } from '../utils/format';
import { CoverageDrawer } from './components/CoverageDrawer';
import { EnrollDrawer } from './components/EnrollDrawer';
import { ExportDialog } from './components/ExportDialog';
import { StatusBadge } from './components/StatusBadge';

interface CoverageTabProps {
  canEnroll: boolean;
  initialPlanId: number | null;
  subOrgId: number | null;
  onSubOrgChange: (id: number | null) => void;
  onChanged: () => void;
}

export function CoverageTab({ canEnroll, initialPlanId, subOrgId, onSubOrgChange, onChanged }: CoverageTabProps) {
  const [planId, setPlanId] = React.useState<number | null>(initialPlanId);
  const [status, setStatus] = React.useState<CoverStatus | 'all'>('all');
  const [searchInput, setSearchInput] = React.useState('');
  const search = useDebounced(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(PAGE_SIZE);
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [enrolling, setEnrolling] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => setPlanId(initialPlanId), [initialPlanId]);
  React.useEffect(() => setPage(1), [planId, status, search, subOrgId, pageSize]);

  const filters: CoverFilters = React.useMemo(() => ({ planId, status, search, subOrgId }), [planId, status, search, subOrgId]);
  const { rows, total, isLoading, isFetching, error, refetch } = useEnrollments(filters, page, pageSize);
  const { plans } = usePlans(subOrgId);
  const activePlans = React.useMemo(() => plans.filter((p) => p.status === 'active'), [plans]);
  const filtered = Boolean(planId || status !== 'all' || search);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const changed = () => {
    refetch();
    onChanged();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, code or member no"
              aria-label="Search coverage"
              className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-8 text-xs text-fg outline-none focus:border-[var(--tt-primary)] sm:text-sm"
            />
            {searchInput && (
              <button type="button" aria-label="Clear search" onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={planId ?? ''}
              onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : null)}
              aria-label="Filter by plan"
              className="h-9 max-w-[14rem] cursor-pointer rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg outline-none focus:border-[var(--tt-primary)] sm:text-sm"
            >
              <option value="">All plans</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <SubOrgFilter value={subOrgId} onChange={onSubOrgChange} />
            <Btn onClick={() => setExporting(true)} icon={<Download className="h-3.5 w-3.5" />}>Export</Btn>
            {canEnroll && <Btn variant="primary" onClick={() => setEnrolling(true)} icon={<Plus className="h-3.5 w-3.5" />}>Cover employees</Btn>}
          </div>
        </div>
        <div className="overflow-x-auto tt-scroll-hidden">
          <SegmentedControl fitText value={status} onChange={setStatus} options={STATUS_TABS} />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>}
        {isLoading ? (
          <div className="flex-1 overflow-hidden"><TableSkeleton rows={8} columns={6} /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            illustration={ILLUSTRATIONS.health}
            compact={filtered}
            title={filtered ? 'Nobody matches' : 'Nobody is covered yet'}
            description={filtered ? 'Try a different plan, status or search.' : 'Cover employees under a plan to start recovering their share with payroll.'}
            action={!filtered && canEnroll ? { label: 'Cover employees', onClick: () => setEnrolling(true) } : undefined}
          />
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-auto transition-opacity md:block', isFetching ? 'opacity-75' : 'opacity-100')}>
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-bg-subtle text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                  <tr>
                    <th className="px-4 py-2.5">Employee</th>
                    <th className="px-3 py-2.5">Plan</th>
                    <th className="px-3 py-2.5">Cover</th>
                    <th className="px-3 py-2.5 text-right">Sum insured</th>
                    <th className="px-3 py-2.5 text-right">Employee pays</th>
                    <th className="px-3 py-2.5">Family</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.id} tabIndex={0} onClick={() => setOpenId(r.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(r.id)} className="cursor-pointer transition-colors hover:bg-bg-subtle focus:bg-bg-subtle focus:outline-none">
                      <td className="px-4 py-3"><p className="font-semibold text-fg">{r.employee.name}</p><p className="text-xs text-fg-muted">{r.employee.code}</p></td>
                      <td className="px-3 py-3"><p className="text-fg">{r.plan.name}</p><p className="text-xs text-fg-muted">{r.plan.insurer}</p></td>
                      <td className="px-3 py-3 text-xs text-fg-muted">{day(r.start_date)} – {day(r.end_date)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-fg">{money(r.sum_insured)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-fg">{money(r.employee_share)}</td>
                      <td className="px-3 py-3 text-xs text-fg-muted">{r.dependents.length} dep · {r.nominees.length} nom</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden md:hidden', isFetching ? 'opacity-75' : 'opacity-100')}>
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpenId(r.id)} className="flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-bg-subtle">
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0"><span className="block truncate text-sm font-semibold text-fg">{r.employee.name}</span><span className="text-xs text-fg-muted">{r.employee.code}</span></span>
                      <StatusBadge status={r.status} />
                    </span>
                    <span className="text-xs text-fg-muted">{r.plan.name} · till {day(r.end_date)}</span>
                    <span className="text-xs text-fg-muted">{money(r.sum_insured)} insured · employee pays {money(r.employee_share)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-line bg-surface px-4 py-2.5">
              <Pagination currentPage={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} pageSizeOptions={[25, 50, 100]} />
            </div>
          </>
        )}
      </div>

      <CoverageDrawer id={openId} canManage={canEnroll} onClose={() => setOpenId(null)} onChanged={changed} />
      {canEnroll && <EnrollDrawer open={enrolling} plans={activePlans} initialPlanId={planId} onClose={() => setEnrolling(false)} onDone={() => { setEnrolling(false); changed(); }} />}
      <ExportDialog open={exporting} plans={plans} initialPlanId={planId} initialStatus={status} onClose={() => setExporting(false)} />
    </div>
  );
}
