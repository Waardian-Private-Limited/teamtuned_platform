'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Play, Settings2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { usePermission } from '@/lib/hooks/usePermission';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import * as api from '../api/payrollRuns.api';
import { PAGE_SIZE_OPTIONS, PAYROLL_PERMISSIONS } from '../constants/payrollRuns.constants';
import { useFilterOptions } from '../hooks/useFilterOptions';
import { useRunActions } from '../hooks/useRunActions';
import { useRunItems } from '../hooks/useRunItems';
import { useRuns } from '../hooks/useRuns';
import { toRun } from '../types/payrollRuns.mapper';
import type { PayItem, Run } from '../types/payrollRuns.model';
import { MONTH_RE, rememberOrder, thisMonth } from '../utils/format';
import { actionBtn, Skeleton, Spinner } from './components/controls';
import { ItemCardList, ItemsTable } from './components/ItemsTable';
import { ItemsToolbar } from './components/ItemsToolbar';
import { MonthPicker } from './components/MonthPicker';
import { PayrollEmptyState } from './components/PayrollEmptyState';
import { PayrollSettingsDrawer } from './components/PayrollSettingsDrawer';
import { RunCard } from './components/RunCard';
import { RunTable } from './components/RunTable';
import { MarkPaidDialog, ReopenDialog } from './components/RunDialogs';

export function PayrollRunsPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { canAny } = usePermission();
  const canEdit = canAny([PAYROLL_PERMISSIONS.EDIT, PAYROLL_PERMISSIONS.ADD]);

  const current = React.useMemo(() => thisMonth(), []);
  const askedMonth = params.get('month') || '';
  const month = MONTH_RE.test(askedMonth) ? askedMonth : current;
  const askedRun = Number(params.get('run')) || null;

  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [itemsVersion, setItemsVersion] = React.useState(0);
  const [paidTarget, setPaidTarget] = React.useState<Run | null>(null);
  const [reopenTarget, setReopenTarget] = React.useState<Run | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const runsState = useRuns(month, subOrgId);
  const { runs, patchRun, refresh } = runsState;
  const reload = React.useCallback(() => {
    refresh();
    setItemsVersion((v) => v + 1);
  }, [refresh]);
  const actions = useRunActions({ month, onRun: patchRun, onReload: reload });

  const realRuns = runs.filter((r) => r.id !== null);
  const plannedRuns = runs.filter((r) => r.id === null);
  const selected = realRuns.find((r) => r.id === askedRun) || realRuns[0] || null;
  const selectedId = selected?.id ?? null;

  const setQuery = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  React.useEffect(() => {
    if (selectedId === null) return;
    let cancelled = false;
    api
      .getRun(selectedId)
      .then((dto) => !cancelled && patchRun(toRun(dto)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedId, itemsVersion, runsState.settledVersion, patchRun]);

  const list = useRunItems(selectedId, itemsVersion + runsState.settledVersion);
  const options = useFilterOptions(subOrgId);

  const view = (item: PayItem) => {
    if (selectedId === null) return;
    rememberOrder(selectedId, list.items.map((i) => i.employee.id));
    router.push(`${basePath}/payroll/${selectedId}/${item.employee.id}`);
  };

  const companies = React.useMemo(() => {
    const seen = new Map<string, { id: number | null; name: string }>();
    runs.forEach((r) => seen.set(String(r.subOrganizationId), { id: r.subOrganizationId, name: r.companyName }));
    if (!seen.size) seen.set('null', { id: null, name: 'Organization' });
    return Array.from(seen.values());
  }, [runs]);

  const counts = selected?.statusCounts ?? null;
  const selectedCalculating = selected ? selected.compute.state === 'queued' || selected.compute.state === 'running' : false;

  return (
    <div className="flex w-full flex-col gap-3 pb-6">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between 2xl:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Payroll</h1>
            <p className="text-[11px] text-fg-muted sm:text-xs">Calculate, review, finalize and pay salaries for every company.</p>
          </div>
          {canEdit && (
            <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Payroll settings" className={cx(actionBtn.secondary, 'lg:hidden')}>
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <MonthPicker month={month} current={current} onChange={(m) => setQuery({ month: m, run: null })} />
          <SubOrgFilter value={subOrgId} onChange={setSubOrgId} allLabel="All companies" />
          {canEdit && plannedRuns.length > 1 && (
            <button type="button" className={actionBtn.primary} disabled={actions.busy === 'all:start'} onClick={() => actions.startAll()}>
              {actions.busy === 'all:start' ? <Spinner /> : <Play className="h-3.5 w-3.5" />}
              Start payroll for all companies
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={() => setSettingsOpen(true)} className={cx(actionBtn.secondary, 'hidden lg:inline-flex')}>
              <Settings2 className="h-3.5 w-3.5" /> Settings
            </button>
          )}
        </div>
      </div>

      {actions.errors.all && <p className="px-1 text-xs font-medium text-[var(--tt-danger)]">{actions.errors.all}</p>}
      {runsState.error && <p className="px-1 text-xs font-medium text-[var(--tt-danger)]">{runsState.error}</p>}

      {runsState.loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        !runsState.error && (
          <div className="flex rounded-xl border border-line bg-surface">
            <PayrollEmptyState
              image="/vectors/flow.svg"
              title="No pay period for this month"
              description="Nobody has a payroll cycle ending in this month. Check the payroll cycle in the employees' policy, or pick another month."
            />
          </div>
        )
      ) : (
        <div className={cx('transition-opacity duration-200', runsState.refreshing && 'opacity-80')}>
          <div className="hidden md:block">
            <RunTable
              runs={runs}
              selectedId={selectedId}
              errors={actions.errors}
              canEdit={canEdit}
              busy={actions.busy}
              onSelect={(r) => setQuery({ month, run: String(r.id) })}
              onStart={actions.start}
              onRecompute={actions.recompute}
              onFinalize={actions.finalize}
              onRelease={actions.release}
              onMarkPaid={setPaidTarget}
              onReopen={setReopenTarget}
              onExport={actions.exportRun}
            />
          </div>
          <div className="grid gap-3 md:hidden">
            {runs.map((run) => (
              <RunCard
                key={run.key}
                run={run}
                selected={run.id !== null && run.id === selectedId}
                canEdit={canEdit}
                busy={actions.busy}
                error={actions.errors[run.key]}
                onSelect={(r) => setQuery({ month, run: String(r.id) })}
                onStart={actions.start}
                onRecompute={actions.recompute}
                onFinalize={actions.finalize}
                onRelease={actions.release}
                onMarkPaid={setPaidTarget}
                onReopen={setReopenTarget}
                onExport={actions.exportRun}
              />
            ))}
          </div>
        </div>
      )}

      {!runsState.loading && selected && (
        <section className="relative flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <ItemsToolbar
            title={realRuns.length > 1 ? `Employees · ${selected.companyName}` : 'Employees'}
            total={list.total}
            searchValue={list.searchInput}
            onSearchChange={list.setSearchInput}
            filters={list.filters}
            onChange={list.update}
            sites={options.sites}
            departments={options.departments}
            counts={counts}
          />
          {list.error && <p className="border-b border-line px-4 py-2.5 text-xs font-medium text-[var(--tt-danger)]">{list.error}</p>}

          {list.loading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : list.items.length === 0 ? (
            list.narrowed ? (
              <PayrollEmptyState
                image="/vectors/review.svg"
                title="No employees match"
                description="Nobody in this payroll matches the search and filters you picked."
                action={{ label: 'Clear filters', onClick: list.clear, icon: 'reset' }}
              />
            ) : selectedCalculating ? (
              <PayrollEmptyState image="/vectors/flow.svg" title="Calculating salaries" description="Employees appear here as soon as the calculation finishes." />
            ) : (
              <PayrollEmptyState
                image="/vectors/credit.svg"
                title={selected.computedAt ? 'No employees in this payroll' : 'Not calculated yet'}
                description={
                  selected.computedAt
                    ? 'No employee was paid by this company in this period.'
                    : 'Run the calculation to see each employee’s payable days, deductions and net pay.'
                }
              />
            )
          ) : (
            <>
              <div className={cx('hidden min-h-0 flex-1 transition-opacity duration-200 md:block', list.refreshing && 'opacity-70')}>
                <ItemsTable items={list.items} filters={list.filters} onSort={list.toggleSort} onView={view} />
              </div>
              <div className={cx('transition-opacity duration-200 md:hidden', list.refreshing && 'opacity-70')}>
                <ItemCardList items={list.items} onView={view} />
              </div>
              <div className="border-t border-line px-4 py-2.5">
                <Pagination
                  currentPage={list.page}
                  totalPages={list.totalPages}
                  totalItems={list.total}
                  pageSize={list.pageSize}
                  onPageChange={list.setPage}
                  onPageSizeChange={list.setPageSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                />
              </div>
            </>
          )}
        </section>
      )}

      <MarkPaidDialog
        run={paidTarget}
        busy={Boolean(paidTarget && actions.busy === `${paidTarget.key}:paid`)}
        onClose={() => setPaidTarget(null)}
        onSubmit={async (paidOn, reference) => {
          if (!paidTarget) return null;
          const err = await actions.markPaid(paidTarget, paidOn, reference);
          if (!err) setPaidTarget(null);
          return err;
        }}
      />
      <ReopenDialog
        run={reopenTarget}
        busy={Boolean(reopenTarget && actions.busy === `${reopenTarget.key}:reopen`)}
        onClose={() => setReopenTarget(null)}
        onSubmit={async (reason) => {
          if (!reopenTarget) return null;
          const err = await actions.reopen(reopenTarget, reason);
          if (!err) setReopenTarget(null);
          return err;
        }}
      />
      {canEdit && (
        <PayrollSettingsDrawer
          open={settingsOpen}
          onClose={() => {
            setSettingsOpen(false);
            reload();
          }}
          companies={companies}
          initialCompany={selected?.subOrganizationId ?? subOrgId ?? companies[0]?.id ?? null}
        />
      )}
    </div>
  );
}
