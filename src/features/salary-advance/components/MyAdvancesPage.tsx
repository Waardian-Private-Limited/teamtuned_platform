'use client';

import React from 'react';
import { ArrowRight, CircleSlash, Plus, Wallet } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { ILLUSTRATIONS, KIND_LABEL } from '../constants/salaryAdvance.constants';
import { useMyAdvances, type MyStatusFilter } from '../hooks/useMyAdvances';
import type { MyAdvanceType, MyOverview } from '../types/salaryAdvance.model';
import { money, monthLabel } from '../utils/format';
import { AdvanceCardList } from './components/AdvanceCardList';
import { interestText } from './components/EligibilityPanel';
import { MyAdvanceDrawer } from './components/MyAdvanceDrawer';
import { RequestAdvanceDrawer } from './components/RequestAdvanceDrawer';
import { Block } from './components/StatusBadges';

const STATUS_OPTIONS: ReadonlyArray<{ value: MyStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Repaying' },
  { value: 'closed', label: 'Closed' },
];

function TypeCard({ type, onRequest }: { type: MyAdvanceType; onRequest: () => void }) {
  const e = type.eligibility;
  return (
    <div className={cx('flex min-w-0 flex-col justify-between gap-4 rounded-xl border bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5', e.eligible ? 'border-line' : 'border-line opacity-90')}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-fg">{type.name}</p>
            <p className="text-[11px] text-fg-muted">{KIND_LABEL[type.kind]}</p>
          </div>
          {!e.eligible && <CircleSlash className="h-4 w-4 shrink-0 text-fg-subtle" />}
        </div>
        {e.eligible ? (
          <>
            {!e.hideLimits && e.maxAmount !== null ? (
              <>
                <p className="mt-3 text-[11px] text-fg-muted">Available now, up to</p>
                <p className="text-2xl font-extrabold tabular-nums text-fg">{money(e.maxAmount)}</p>
              </>
            ) : (
              <p className="mt-3 text-sm font-semibold text-fg">Available to request</p>
            )}
            <p className="mt-1.5 text-xs text-fg-muted">
              In one go or instalments · {interestText(e)}
            </p>
          </>
        ) : (
          <ul className="mt-3 space-y-1">
            {(e.reasons.length ? e.reasons : ['Not available to you right now.']).map((r) => (
              <li key={r} className="text-xs text-fg-muted">{r}</li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={onRequest}
        disabled={!e.eligible}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 sm:text-sm"
      >
        Request
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function OutstandingCard({ overview }: { overview: MyOverview }) {
  const active = overview.active.filter((a) => a.status === 'active');
  const next = active
    .map((a) => a.nextDue)
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
  const nextMonth = next[0]?.month;
  const nextAmount = next.filter((n) => n.month === nextMonth).reduce((s, n) => s + n.amount, 0);
  return (
    <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-[var(--tt-shadow-sm)]">
      <div>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-fg-muted" />
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">You owe</p>
        </div>
        <p className="mt-2 text-4xl font-extrabold tabular-nums text-fg">{money(overview.outstanding)}</p>
        <p className="mt-1 text-sm text-fg-muted">
          {active.length ? `${active.length} ${active.length === 1 ? 'advance' : 'advances'} being repaid` : 'Nothing to repay'}
          {overview.pending.length ? ` · ${overview.pending.length} waiting for approval` : ''}
        </p>
      </div>
      {nextMonth && (
        <p className="mt-4 rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg">
          <span className="font-semibold tabular-nums">{money(nextAmount)}</span> is deducted from your {monthLabel(nextMonth)} salary.
        </p>
      )}
    </div>
  );
}

export function MyAdvancesPage() {
  const m = useMyAdvances();
  const [requestFor, setRequestFor] = React.useState<number | null | undefined>(undefined);
  const [openId, setOpenId] = React.useState<number | null>(null);
  const o = m.overview;
  const canRequest = Boolean(o?.types.some((t) => t.eligibility.eligible));
  const { refresh } = m;

  const onCreated = React.useCallback(() => {
    setRequestFor(undefined);
    refresh();
  }, [refresh]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-fg sm:text-2xl">My advances</h1>
          <p className="text-sm text-fg-muted">Take an advance on your salary and repay it in instalments from payroll.</p>
        </div>
        <button
          type="button"
          onClick={() => setRequestFor(null)}
          disabled={!canRequest}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Request advance
        </button>
      </header>

      {m.overviewError && <p role="alert" className="text-sm font-medium text-[var(--tt-danger)]">{m.overviewError}</p>}

      {m.overviewLoading ? (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Block className="h-44 rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Block className="h-44 rounded-xl" />
            <Block className="h-44 rounded-xl" />
          </div>
        </div>
      ) : (
        o && (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <OutstandingCard overview={o} />
            {o.types.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {o.types.map((t) => (
                  <TypeCard key={t.id} type={t} onRequest={() => setRequestFor(t.id)} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-line bg-surface p-6 text-center text-sm text-fg-muted">
                {o.enabled ? 'No advance types are offered to you yet.' : 'Salary advances are not part of your policy yet.'}
              </div>
            )}
          </div>
        )
      )}

      <section className="flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
          <h2 className="text-sm font-bold text-fg sm:text-base">Requests</h2>
          <div className="overflow-x-auto tt-scroll-hidden">
            <SegmentedControl options={STATUS_OPTIONS} value={m.status} onChange={m.setStatus} fitText />
          </div>
        </div>
        {m.listError && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{m.listError}</p>}
        {m.listLoading ? (
          <TableSkeleton rows={4} columns={4} />
        ) : m.rows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              illustration={ILLUSTRATIONS.credit}
              title={m.status === 'all' ? 'No advances yet' : 'Nothing here'}
              description={m.status === 'all' ? 'When you request an advance, you can follow its approval and repayment here.' : 'No requests with this status.'}
              action={m.status === 'all' && canRequest ? { label: 'Request advance', onClick: () => setRequestFor(null) } : undefined}
            />
          </div>
        ) : (
          <>
            <div className={cx('grid divide-y divide-line transition-opacity duration-200 md:grid-cols-2 md:divide-y-0 md:gap-px md:bg-line', m.listFetching ? 'opacity-70' : 'opacity-100')}>
              <AdvanceCardList rows={m.rows} onOpen={(r) => setOpenId(r.id)} />
            </div>
            {m.total > m.pageSize && (
              <div className="mt-auto border-t border-line px-4 py-2.5">
                <Pagination currentPage={m.page} totalPages={m.totalPages} totalItems={m.total} pageSize={m.pageSize} onPageChange={m.setPage} />
              </div>
            )}
          </>
        )}
      </section>

      {o && (
        <RequestAdvanceDrawer open={requestFor !== undefined} types={o.types} initialTypeId={requestFor ?? null} onClose={() => setRequestFor(undefined)} onCreated={onCreated} />
      )}
      <MyAdvanceDrawer id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
    </div>
  );
}
