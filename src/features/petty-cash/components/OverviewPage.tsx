'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ILLUSTRATIONS, OVERVIEW_ACCESS } from '../constants/petty-cash.constants';
import { useOverview } from '../hooks/useOverview';
import { usePettyCashAccess } from '../hooks/usePettyCashAccess';
import { usePettyCashBasePath } from '../hooks/usePettyCashBasePath';
import { money, plural } from '../utils/format';
import { ExpenseCardList } from './components/ExpenseCardList';
import { Block, CategoryIcon, Gate, PageHeader, Panel } from './components/Primitives';
import { TrendChart } from './components/TrendChart';
import { WalletCard } from './components/WalletCard';

export function OverviewPage() {
  const { enabled, canAny } = usePettyCashAccess();
  return (
    <Gate enabled={enabled} allowed={canAny(OVERVIEW_ACCESS)} what="the petty cash overview">
      <Overview />
    </Gate>
  );
}

function Kpi({ label, value, note, href }: { label: string; value: string; note: string; href?: string }) {
  const body = (
    <>
      <p className="truncate text-xs font-semibold text-fg-muted">{label}</p>
      <p className="mt-1.5 truncate text-xl font-extrabold tabular-nums text-fg">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-fg-muted">{note}</p>
    </>
  );
  const cls = 'min-w-0 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)]';
  return href ? (
    <Link href={href} className={`${cls} block transition-colors hover:bg-bg-subtle/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Overview() {
  const base = usePettyCashBasePath();
  const r = useOverview();
  const o = r.data;

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Petty cash" description="Cash at sites and offices, what is waiting on you, and where it went." />
      {r.error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{r.error}</p>}

      {!o ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Block key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Cash in wallets" value={money(o.wallets.cashInHand)} note={`${plural(o.wallets.active, 'active wallet', 'active wallets')}${o.wallets.frozen ? ` · ${o.wallets.frozen} frozen` : ''}`} href={`${base}/wallets`} />
          <Kpi label="On hold" value={money(o.wallets.held)} note="Pending expenses" href={`${base}/expenses?status=pending`} />
          <Kpi label="To approve" value={money(o.queues.toApprove.amount)} note={plural(o.queues.toApprove.count, 'expense', 'expenses')} href={`${base}/expenses?status=pending`} />
          <Kpi label="Paper bills pending" value={String(o.queues.paperBills)} note="Waiting to be ticked" href={`${base}/inward?view=paper`} />
          <Kpi label="Goods to receive" value={String(o.queues.goodsInward)} note="Waiting in the goods register" href={`${base}/inward`} />
          <Kpi label="Fund requests" value={String(o.queues.fundRequests)} note="Open requests" href={`${base}/fund-requests`} />
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <TrendChart trend={o?.trend ?? null} loading={!o} />
        </div>
        <Panel title="Top categories" className="min-w-0">
          {!o ? (
            <Block className="h-40 w-full" />
          ) : o.topCategories.length === 0 ? (
            <p className="text-sm text-fg-muted">No approved expenses yet.</p>
          ) : (
            <ul className="space-y-3">
              {o.topCategories.map((c) => {
                const top = o.topCategories[0].amount || 1;
                return (
                  <li key={c.id} className="flex items-center gap-3">
                    <CategoryIcon icon={c.icon} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 text-xs sm:text-sm">
                        <span className="truncate font-semibold text-fg">{c.name}</span>
                        <span className="shrink-0 tabular-nums text-fg">{money(c.amount)}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-bg-subtle">
                        <div className="h-full rounded-full bg-fg" style={{ width: `${Math.max(4, Math.round((c.amount / top) * 100))}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {o && o.lowWallets.length > 0 && (
        <section aria-labelledby="low-wallets">
          <h2 id="low-wallets" className="mb-2 text-sm font-bold text-fg">Wallets running low</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {o.lowWallets.map((w) => (
              <WalletCard key={w.id} wallet={w} href={`${base}/wallets/${w.id}`} />
            ))}
          </div>
        </section>
      )}

      <Panel
        title="Recent expenses"
        flush
        aside={
          <Link href={`${base}/expenses`} className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg">
            View all
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      >
        {!o ? (
          <Block className="m-4 h-32" />
        ) : o.recent.length === 0 ? (
          <div className="p-6">
            <EmptyState compact title="No expenses yet" description="Expenses added against petty cash wallets show here." />
          </div>
        ) : (
          <div className="divide-y divide-line">
            <ExpenseCardList rows={o.recent} href={(id) => `${base}/expenses/${id}`} showSpender />
          </div>
        )}
      </Panel>
      {o && o.wallets.total === 0 && (
        <div className="rounded-xl border border-line bg-surface p-6">
          <EmptyState illustration={ILLUSTRATIONS.overview} title="No wallets yet" description="Create a wallet for a site or office to start tracking petty cash." />
        </div>
      )}
    </div>
  );
}
