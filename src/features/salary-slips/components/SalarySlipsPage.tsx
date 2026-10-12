'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import {
  DRAFT_BLOCK_REASON,
  GENERATE_ALL_NOTE,
  PAGE_SIZE_OPTIONS,
  PENDING_BLOCK_REASON,
  SALARY_SLIP_PERMISSIONS,
} from '../constants/salarySlips.constants';
import { useSalarySlipRuns } from '../hooks/useSalarySlipRuns';
import { useSalarySlipItems } from '../hooks/useSalarySlipItems';
import { useSalarySlipActions } from '../hooks/useSalarySlipActions';
import { useRunPayslipSummary } from '../hooks/useRunPayslipSummary';
import { useSiteOptions } from '../hooks/useSiteOptions';
import type { PayslipCounts, PayslipLayout, SalarySlipRow } from '../types/salarySlips.model';
import { monthLabel } from '../utils/format';
import { SalarySlipsToolbar } from './components/SalarySlipsToolbar';
import { RunSummaryBar } from './components/RunSummaryBar';
import { SlipsFilterBar } from './components/SlipsFilterBar';
import { SlipTable } from './components/SlipTable';
import { SlipCardList } from './components/SlipCardList';
import { SalarySlipsEmptyState } from './components/SalarySlipsEmptyState';
import { DownloadPayslipsDialog } from './components/DownloadPayslipsDialog';
import { ConfirmPayslipDialog } from './components/ConfirmPayslipDialog';
import { HoldPayslipDialog } from './components/HoldPayslipDialog';
import type { SlipRowPolicy } from './components/SlipRowActions';

type ExportScope = { kind: 'all' } | { kind: 'selected'; ids: number[] };
type ConfirmState = { kind: 'generate-all' } | { kind: 'generate-selected'; ids: number[] } | { kind: 'release'; row: SalarySlipRow };
type HoldState = { ids: number[]; target: string; skipped: number };

function countRows(rows: SalarySlipRow[]): PayslipCounts {
  return rows.reduce<PayslipCounts>(
    (acc, r) => {
      if (r.status === 'visible') acc.generated += 1;
      else if (r.status === 'not_generated') acc.notGenerated += 1;
      else if (r.status === 'held') acc.held += 1;
      return acc;
    },
    { generated: 0, notGenerated: 0, held: 0 }
  );
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function SalarySlipsPage() {
  const { can } = usePermission();
  const canEdit = can(SALARY_SLIP_PERMISSIONS.EDIT) || can(SALARY_SLIP_PERMISSIONS.ADD) || can('HR_MODE');

  const runs = useSalarySlipRuns();
  const run = runs.run;
  const items = useSalarySlipItems(run);
  const summary = useRunPayslipSummary(run?.id ?? null, runs.replaceRun);
  const refreshItems = items.refetch;
  const refreshSummary = summary.refetch;
  const onChanged = React.useCallback(() => {
    refreshItems();
    refreshSummary();
  }, [refreshItems, refreshSummary]);
  const actions = useSalarySlipActions(runs.replaceRun, onChanged);
  const siteOptions = useSiteOptions();

  const [exportScope, setExportScope] = React.useState<ExportScope | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [confirmError, setConfirmError] = React.useState('');
  const [hold, setHold] = React.useState<HoldState | null>(null);

  const isDraft = run?.status === 'draft';
  const isPaid = run?.status === 'paid';
  const pending = Boolean(run?.pendingAction);
  const generateBlockedReason = isDraft ? DRAFT_BLOCK_REASON : pending ? PENDING_BLOCK_REASON : null;
  const allGenerated = Boolean(run?.isReleased && summary.summary?.counts && summary.summary.counts.notGenerated === 0);
  const generateAllBlockedReason = generateBlockedReason ?? (allGenerated ? 'Every payslip is already generated' : null);
  const holdBlockedReason = pending ? PENDING_BLOCK_REASON : null;
  const rowPolicy: SlipRowPolicy = { canEdit, canHold: !isPaid, blockedReason: holdBlockedReason };
  const pageCounts = React.useMemo(() => countRows(items.rows), [items.rows]);
  const busyFor = (employeeId: number) => (actions.rowBusy?.id === employeeId ? actions.rowBusy.kind : null);
  const nameOf = (employeeId: number) => items.knownRow(employeeId)?.name || `Employee #${employeeId}`;

  const closeExport = () => {
    setExportScope(null);
    actions.clearExportError();
  };

  const submitExport = async (layout: PayslipLayout, includeHeld: boolean) => {
    if (!run || !exportScope) return;
    const ok = await actions.exportSlips(run, layout, exportScope.kind === 'selected' ? exportScope.ids : null, includeHeld);
    if (ok) {
      if (exportScope.kind === 'selected') items.clearSelection();
      setExportScope(null);
    }
  };

  const openConfirm = (next: ConfirmState) => {
    actions.clearRowError();
    setConfirmError('');
    setConfirm(next);
  };

  const closeConfirm = () => {
    setConfirm(null);
    setConfirmError('');
  };

  const submitConfirm = async () => {
    if (!run || !confirm) return;
    let err: string | null = null;
    if (confirm.kind === 'release') err = await actions.releaseHold(run, confirm.row);
    else {
      err = await actions.generate(run, confirm.kind === 'generate-selected' ? confirm.ids : null);
      if (!err && confirm.kind === 'generate-selected') items.clearSelection();
    }
    if (err) setConfirmError(err);
    else setConfirm(null);
  };

  const openHold = (ids: number[]) => {
    actions.clearRowError();
    const targets = ids.filter((id) => items.knownRow(id)?.status !== 'held');
    if (!targets.length) {
      setHold(null);
      return;
    }
    setHold({
      ids: targets,
      target: targets.length === 1 ? nameOf(targets[0]) : `${targets.length} selected employees`,
      skipped: ids.length - targets.length,
    });
  };

  const submitHold = async (reason: string) => {
    if (!run || !hold) return 'Pick a payroll first';
    const result = await actions.holdMany(run, hold.ids, reason);
    if (!result.error) {
      if (hold.ids.length > 1) items.clearSelection();
      setHold(null);
      return null;
    }
    if (hold.ids.length === 1) return result.error;
    const who = result.failedId !== null ? nameOf(result.failedId) : 'an employee';
    const remaining = hold.ids.slice(result.done);
    setHold({ ...hold, ids: remaining, target: remaining.length === 1 ? nameOf(remaining[0]) : `${remaining.length} remaining employees` });
    return `Stopped at ${who}: ${result.error}${result.done > 0 ? ` ${result.done === 1 ? '1 payslip was' : `${result.done} payslips were`} held before this.` : ''}`;
  };

  const selectedIds = Array.from(items.selected);
  const selectedHeldOnly = selectedIds.length > 0 && selectedIds.every((id) => items.knownRow(id)?.status === 'held');

  const monthText = monthLabel(runs.month);
  const showSkeleton = runs.loading || (run !== null && items.isInitialLoading);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <SalarySlipsToolbar
        month={runs.month}
        onMonthChange={runs.setMonth}
        runs={runs.runs}
        runId={run?.id ?? null}
        onRunChange={runs.setRunId}
        total={run ? items.total : null}
      />

      {run && (
        <RunSummaryBar
          run={run}
          summary={summary.summary}
          summaryLoaded={summary.loaded}
          pageCounts={pageCounts}
          canGenerate={canEdit}
          generateBlockedReason={generateAllBlockedReason}
          canDownloadAll={run.employees > 0 || items.total > 0}
          onGenerateAll={() => openConfirm({ kind: 'generate-all' })}
          onDownloadAll={() => setExportScope({ kind: 'all' })}
        />
      )}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {run && (
          <SlipsFilterBar
            searchValue={items.searchInput}
            onSearchChange={items.setSearchInput}
            siteId={items.siteId}
            siteOptions={siteOptions}
            onSiteChange={items.setSiteId}
            selectedCount={items.selected.size}
            canEdit={canEdit}
            canHold={!isPaid}
            generateBlockedReason={generateBlockedReason}
            holdBlockedReason={holdBlockedReason ?? (selectedHeldOnly ? 'All selected payslips are already held' : null)}
            onGenerateSelected={() => openConfirm({ kind: 'generate-selected', ids: selectedIds })}
            onHoldSelected={() => openHold(selectedIds)}
            onDownloadSelected={() => setExportScope({ kind: 'selected', ids: selectedIds })}
            onClearSelection={items.clearSelection}
          />
        )}

        {(runs.error || items.error || actions.rowError) && (
          <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">
            {runs.error || items.error || actions.rowError}
          </p>
        )}

        {showSkeleton ? (
          <div className="flex-1 overflow-hidden">
            <TableSkeleton rows={8} columns={5} />
          </div>
        ) : !run ? (
          <SalarySlipsEmptyState variant="no-run" monthText={monthText} />
        ) : items.rows.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', items.isFetching ? 'opacity-70' : 'opacity-100')}>
            <SalarySlipsEmptyState
              variant={items.hasActiveFilters ? 'filtered' : 'no-items'}
              monthText={monthText}
              onClear={items.clearFilters}
            />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', items.isFetching ? 'opacity-75' : 'opacity-100')}>
              <SlipTable
                rows={items.rows}
                selected={items.selected}
                allOnPageSelected={items.allOnPageSelected}
                onToggle={items.toggle}
                onTogglePage={items.togglePage}
                policy={rowPolicy}
                busyFor={busyFor}
                onGenerate={(row) => actions.generateOne(run, row)}
                onHold={(row) => openHold([row.employeeId])}
                onReleaseHold={(row) => openConfirm({ kind: 'release', row })}
                onDownload={(row) => actions.downloadOne(run, row)}
              />
            </div>
            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', items.isFetching ? 'opacity-75' : 'opacity-100')}>
              <SlipCardList
                rows={items.rows}
                selected={items.selected}
                onToggle={items.toggle}
                policy={rowPolicy}
                busyFor={busyFor}
                onGenerate={(row) => actions.generateOne(run, row)}
                onHold={(row) => openHold([row.employeeId])}
                onReleaseHold={(row) => openConfirm({ kind: 'release', row })}
                onDownload={(row) => actions.downloadOne(run, row)}
              />
            </div>
            <div className="border-t border-line bg-surface px-4 py-2.5">
              <Pagination
                currentPage={items.page}
                totalPages={items.totalPages}
                totalItems={items.total}
                pageSize={items.pageSize}
                onPageChange={items.setPage}
                onPageSizeChange={items.setPageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
              />
            </div>
          </>
        )}
      </div>

      <DownloadPayslipsDialog
        open={Boolean(exportScope)}
        scopeLabel={
          exportScope?.kind === 'selected'
            ? `${exportScope.ids.length} selected employee${exportScope.ids.length === 1 ? '' : 's'}`
            : `All employees · ${run?.companyName ?? ''} · ${monthText}`
        }
        busy={actions.exporting}
        error={actions.exportError}
        onClose={closeExport}
        onSubmit={submitExport}
      />

      <ConfirmPayslipDialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'release' ? 'Release hold' : confirm?.kind === 'generate-selected' ? 'Generate selected payslips' : 'Generate all payslips'}
        message={
          confirm?.kind === 'release' ? (
            <>
              The hold on <span className="font-semibold text-fg">{confirm.row.name}</span> is lifted and the salary is paid with this payroll. If the
              payslip was generated, it becomes visible in the app again.
            </>
          ) : confirm?.kind === 'generate-selected' ? (
            <>
              Payslips of <span className="font-semibold text-fg">{plural(confirm.ids.length, 'selected employee')}</span> become visible in the app.
              Held payslips stay hidden.
            </>
          ) : (
            <>
              {GENERATE_ALL_NOTE} for <span className="font-semibold text-fg">{run?.companyName}</span>, {run?.periodLabel}.
            </>
          )
        }
        confirmLabel={confirm?.kind === 'release' ? 'Release hold' : 'Generate'}
        busy={confirm?.kind === 'release' ? actions.rowBusy?.kind === 'release' : actions.generating}
        error={confirmError}
        onClose={closeConfirm}
        onConfirm={submitConfirm}
      />

      <HoldPayslipDialog
        open={Boolean(hold)}
        target={hold?.target ?? ''}
        count={hold?.ids.length ?? 0}
        skippedNote={hold && hold.skipped > 0 ? `${plural(hold.skipped, 'selected payslip')} already held ${hold.skipped === 1 ? 'is' : 'are'} skipped.` : null}
        busy={actions.holding}
        progress={actions.holdProgress}
        onClose={() => setHold(null)}
        onSubmit={submitHold}
      />
    </div>
  );
}
