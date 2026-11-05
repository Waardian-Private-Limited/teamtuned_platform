'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, Play, Settings2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { usePermission } from '@/lib/hooks/usePermission';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import * as api from '../api/payrollRuns.api';
import { PAGE_SIZE_OPTIONS, PAYROLL_PERMISSIONS } from '../constants/payrollRuns.constants';
import { useFilterOptions } from '../hooks/useFilterOptions';
import { usePreview } from '../hooks/usePreview';
import { useRunActions } from '../hooks/useRunActions';
import { useRunItems } from '../hooks/useRunItems';
import { useRuns } from '../hooks/useRuns';
import { toRun } from '../types/payrollRuns.mapper';
import type { PayItem, Run } from '../types/payrollRuns.model';
import { money, MONTH_RE, rememberOrder, thisMonth } from '../utils/format';
import { actionBtn, Skeleton, Spinner } from './components/controls';
import { ItemCardList, ItemsTable } from './components/ItemsTable';
import { ItemsToolbar } from './components/ItemsToolbar';
import { MonthPicker } from './components/MonthPicker';
import { PayrollEmptyState } from './components/PayrollEmptyState';
import { PayrollSettingsDrawer } from './components/PayrollSettingsDrawer';
import { useRunSearchHits } from '../hooks/useRunSearchHits';
import { PreviewPanel } from './components/PreviewPanel';
import { RunCard } from './components/RunCard';
import { RunTable } from './components/RunTable';
import { HoldDialog } from './components/RunDialogs';
import { RequestDrawer } from '@/features/approvals/components/RequestDrawer';
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
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [previewKey, setPreviewKey] = React.useState<string | null>(null);

  const runsState = useRuns(month, subOrgId);
  const { runs, patchRun, refresh } = runsState;
  const reload = React.useCallback(() => {
    refresh();
    setItemsVersion((v) => v + 1);
  }, [refresh]);
  const actions = useRunActions({ month, onRun: patchRun, onReload: reload });
  // The finalize / reopen approval opened from a waiting run (Approve / Reject for whoever may decide).
  const [reviewId, setReviewId] = React.useState<number | null>(null);
  // Employees whose pay could not be calculated do not block the payroll: after a warning they are put on hold
  // (not paid in this payroll, kept to fix and release later) and everyone else is finalized.
  const finalizeRun = React.useCallback((run: Run) => {
    const n = run.totals.errors;
    if (!n) return actions.finalize(run);
    setConfirm({
      title: 'Finalize with errors?',
      body: (
        <div className="space-y-2 text-sm text-fg-muted">
          <p>{n} employee{n === 1 ? '' : 's'} could not be calculated. They will be <span className="font-semibold text-fg">put on hold and not paid</span> in this payroll, with the error as the reason.</p>
          <p>Everyone else is finalized. Fix the held employees and release their hold later, or pay them in a later payroll.</p>
        </div>
      ),
      cta: `Hold ${n} and finalize`,
      danger: true,
      run: () => actions.finalize(run, true),
    });
    return undefined;
  }, [actions]);

  // Employees picked to finalize on their own (a draft payroll): the rest move to a new batch to finalize later.
  const [picked, setPicked] = React.useState<Set<number>>(() => new Set());
  const pick = React.useCallback((ids: number[], on: boolean) => setPicked((p) => {
    const next = new Set(p);
    for (const id of ids) { if (on) next.add(id); else next.delete(id); }
    return next;
  }), []);
  const finalizePicked = React.useCallback((run: Run) => {
    const ids = [...picked];
    const others = Math.max(0, run.totals.employees - ids.length);
    setConfirm({
      title: `Finalize ${ids.length} employee${ids.length === 1 ? '' : 's'}?`,
      body: (
        <div className="space-y-2 text-sm text-fg-muted">
          <p>Only the picked employees are finalized{run.finalizeNeedsApproval ? ' (after approval)' : ''} and can be paid now. Picked employees whose pay could not be calculated are put on hold.</p>
          {others > 0 && <p>The other <span className="font-semibold text-fg">{others}</span> move, as calculated, to <span className="font-semibold text-fg">a new batch</span> of {run.companyName} for this period. It stays a draft: recalculate, finalize and pay it later.</p>}
        </div>
      ),
      cta: `Finalize ${ids.length}`,
      run: async () => { if (await actions.finalizeSome(run, ids, others)) setPicked(new Set()); },
    });
  }, [picked, actions]);

  const realRuns = runs.filter((r) => r.id !== null);
  const plannedRuns = runs.filter((r) => r.id === null);
  // Payroll not separate per company (organization-wide runs): one payroll for every company and site, so there is no
  // company to pick, and the site / department filters list everything under the organization.
  const combined = runs.length > 0 && runs.every((r) => r.subOrganizationId === null);
  React.useEffect(() => {
    if (combined && subOrgId !== null) setSubOrgId(null);
  }, [combined, subOrgId]);
  const selected = realRuns.find((r) => r.id === askedRun) || realRuns[0] || null;
  const selectedId = selected?.id ?? null;
  React.useEffect(() => { setPicked(new Set()); }, [selectedId]);
  const canFinalizePicked = Boolean(canEdit && selected && selected.stage === 'review' && !selected.pendingAction);
  // Ticking also holds / releases salaries in bulk, in a draft, finalized or paid payroll.
  const canPick = Boolean(canEdit && selected && !selected.pendingAction && ['review', 'finalized', 'released', 'paid'].includes(selected.stage));
  const [holdAsk, setHoldAsk] = React.useState<boolean | null>(null);
  const [holdBusy, setHoldBusy] = React.useState(false);
  const holdPicked = async (hold: boolean, reason: string): Promise<string | null> => {
    if (!selected?.id) return null;
    setHoldBusy(true);
    try {
      const r = await api.holdMany(selected.id, [...picked], hold, reason);
      const verb = hold ? 'put on hold' : 'released';
      const why = [...new Set(r.skipped.map((x) => x.reason))].join('; ');
      if (r.changed.length) showSuccess(`${r.changed.length} salar${r.changed.length === 1 ? 'y' : 'ies'} ${verb}${r.skipped.length ? `; ${r.skipped.length} left as is (${why})` : ''}`);
      else return `Nothing ${verb}: ${why || 'no change'}`;
      setPicked(new Set());
      setHoldAsk(null);
      reload();
      setItemsVersion((v) => v + 1);
      return null;
    } catch (e) {
      return messageOf(e);
    } finally {
      setHoldBusy(false);
    }
  };
  // Many companies: the run list folds to the open run so the employees table stays in view.
  const [runsOpen, setRunsOpen] = React.useState<boolean | null>(null);
  const folding = runs.length > 3;
  const open = !folding || (runsOpen ?? !selected);
  const shownRuns = open ? runs : runs.filter((r) => r.id === selectedId || r.key === previewKey);
  const runSummary = React.useMemo(() => {
    const by = (test: (r: Run) => boolean) => runs.filter(test).length;
    return [
      `${runs.length} payrolls`,
      by((r) => r.id === null) ? `${by((r) => r.id === null)} not started` : null,
      by((r) => r.status === 'draft') ? `${by((r) => r.status === 'draft')} draft` : null,
      by((r) => r.status === 'finalized') ? `${by((r) => r.status === 'finalized')} finalized` : null,
      by((r) => r.status === 'paid') ? `${by((r) => r.status === 'paid')} paid` : null,
      `net ${money(runs.reduce((n, r) => n + (r.totals?.net || 0), 0))}`,
    ].filter(Boolean).join(' · ');
  }, [runs]);
  const previewRun = plannedRuns.find((r) => r.key === previewKey) || null;
  const pv = usePreview(previewRun);

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
  // The searched name may sit in another company's run: ask every run, jump to one that has them.
  const found = useRunSearchHits(runs, list.filters.search, itemsVersion + runsState.settledVersion);
  const hitsHere = found.hits.get(selectedId ?? -1) ?? 0;
  const firstOther = realRuns.find((r) => r.id !== selectedId && (found.hits.get(r.id as number) ?? 0) > 0) || null;
  React.useEffect(() => {
    if (!found.searching && selectedId !== null && found.hits.size > 0 && hitsHere === 0 && firstOther) setQuery({ month, run: String(firstOther.id) });
  }, [found.searching, found.hits, selectedId, hitsHere, firstOther, month, setQuery]);
  const otherHits = realRuns.filter((r) => r.id !== selectedId && (found.hits.get(r.id as number) ?? 0) > 0);

  const viewPreview = (item: PayItem) => {
    if (!pv.target) return;
    rememberOrder(0, pv.all.map((i) => i.employee.id));
    const t = pv.target;
    const q = new URLSearchParams({ month: t.month, company: String(t.subOrganizationId ?? 0), start: t.periodStart, end: t.periodEnd });
    router.push(`${basePath}/payroll/preview/${item.employee.id}?${q.toString()}`);
  };

  const askDelete = (run: Run) =>
    setConfirm({
      title: 'Delete this draft payroll?',
      body: `The draft for ${run.companyName}, ${run.periodLabel}, and its calculation are removed. Nothing has been paid or settled yet, so you can start it again any time.`,
      cta: 'Delete draft',
      danger: true,
      run: () => actions.remove(run),
    });

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
          {!combined && <SubOrgFilter value={subOrgId} onChange={setSubOrgId} allLabel="All companies" />}
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
          {folding && (
            <button type="button" onClick={() => setRunsOpen(!open)} aria-expanded={open}
              className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left hover:bg-bg-subtle">
              <span className="min-w-0 truncate text-xs text-fg-muted sm:text-sm"><span className="font-semibold text-fg">Payrolls</span> · {runSummary}</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-fg">
                {open ? <>Show open only <ChevronUp className="h-3.5 w-3.5" /></> : <>Show all {runs.length} <ChevronDown className="h-3.5 w-3.5" /></>}
              </span>
            </button>
          )}
          <div className="hidden md:block">
            <RunTable
              runs={shownRuns}
              selectedId={selectedId}
              errors={actions.errors}
              canEdit={canEdit}
              busy={actions.busy}
              onSelect={(r) => { setQuery({ month, run: String(r.id) }); if (folding) setRunsOpen(false); }}
              onStart={actions.start}
              onPreview={(r) => setPreviewKey((k) => (k === r.key ? null : r.key))}
              onDelete={askDelete}
              previewKey={previewKey}
              onRecompute={actions.recompute}
              onFinalize={finalizeRun}
              onRelease={actions.release}
              onMarkPaid={setPaidTarget}
              onReopen={setReopenTarget}
              onExport={actions.exportRun}
              onReviewApproval={(r) => setReviewId(r.approvalRequestId)}
            />
          </div>
          <div className="grid gap-3 md:hidden">
            {shownRuns.map((run) => (
              <RunCard
                key={run.key}
                run={run}
                selected={run.id !== null && run.id === selectedId}
                canEdit={canEdit}
                busy={actions.busy}
                error={actions.errors[run.key]}
                onSelect={(r) => setQuery({ month, run: String(r.id) })}
                onStart={actions.start}
                onPreview={(r) => setPreviewKey((k) => (k === r.key ? null : r.key))}
                onDelete={askDelete}
                previewing={run.key === previewKey}
                onRecompute={actions.recompute}
                onFinalize={finalizeRun}
                onRelease={actions.release}
                onMarkPaid={setPaidTarget}
                onReopen={setReopenTarget}
                onExport={actions.exportRun}
                onReviewApproval={(r) => setReviewId(r.approvalRequestId)}
              />
            ))}
          </div>
        </div>
      )}

      <RequestDrawer id={reviewId} onClose={() => setReviewId(null)} onChanged={() => { setReviewId(null); reload(); }} />

      {!runsState.loading && previewRun && (
        <PreviewPanel
          run={previewRun}
          pv={pv}
          canEdit={canEdit}
          starting={actions.busy === `${previewRun.key}:start`}
          onStart={async () => {
            if (await actions.start(previewRun)) setPreviewKey(null);
          }}
          onClose={() => setPreviewKey(null)}
          onView={viewPreview}
          sites={options.sites}
          departments={options.departments}
        />
      )}

      {!runsState.loading && !previewRun && selected && (
        <section className="relative flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <ItemsToolbar
            title={realRuns.length > 1 ? `Employees · ${selected.companyName}${selected.batch > 1 ? ` · Batch ${selected.batch}` : ''}` : 'Employees'}
            total={list.total}
            searchValue={list.searchInput}
            onSearchChange={list.setSearchInput}
            filters={list.filters}
            onChange={list.update}
            sites={options.sites}
            departments={options.departments}
            counts={counts}
          />
          {otherHits.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-bg-subtle/50 px-4 py-2 text-xs text-fg-muted">
              <span>Also found in:</span>
              {otherHits.map((r) => (
                <button key={r.key} type="button" onClick={() => setQuery({ month, run: String(r.id) })} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 font-semibold text-fg hover:bg-bg-subtle">
                  {r.companyName}<span className="font-medium text-fg-muted">({found.hits.get(r.id as number)})</span>
                </button>
              ))}
            </div>
          )}
          {list.error && <p className="border-b border-line px-4 py-2.5 text-xs font-medium text-[var(--tt-danger)]">{list.error}</p>}
          {canPick && picked.size > 0 && selected && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg-subtle px-4 py-2">
              <p className="text-xs text-fg sm:text-sm"><span className="font-semibold">{picked.size} picked</span> of {selected.totals.employees}{canFinalizePicked ? ' · Finalize picked moves the rest to a new batch' : ''}</p>
              <div className="flex items-center gap-2">
                <button type="button" className={actionBtn.secondary} onClick={() => setPicked(new Set())}>Clear</button>
                <button type="button" className={actionBtn.secondary} disabled={holdBusy} onClick={() => setHoldAsk(true)}>Hold salary</button>
                <button type="button" className={actionBtn.secondary} disabled={holdBusy} onClick={() => setHoldAsk(false)}>Release hold</button>
                {canFinalizePicked && <button type="button" className={actionBtn.primary} disabled={Boolean(actions.busy)} onClick={() => finalizePicked(selected)}>Finalize picked</button>}
              </div>
            </div>
          )}

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
                <ItemsTable items={list.items} filters={list.filters} onSort={list.toggleSort} onView={view} picked={canPick ? picked : null} onPick={pick} />
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
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      <HoldDialog open={holdAsk !== null} holding={holdAsk === true} name={`${picked.size} employee${picked.size === 1 ? '' : 's'}`} busy={holdBusy}
        onClose={() => setHoldAsk(null)} onSubmit={(reason) => holdPicked(holdAsk === true, reason)} />
      {canEdit && (
        <PayrollSettingsDrawer
          open={settingsOpen}
          onClose={() => {
            setSettingsOpen(false);
            reload();
          }}
          companies={companies}
        />
      )}
    </div>
  );
}
