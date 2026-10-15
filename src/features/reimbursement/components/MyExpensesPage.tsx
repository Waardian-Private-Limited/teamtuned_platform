'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Clock3, Download, HandCoins, Hourglass, Plus, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { ILLUSTRATIONS, LEDGER_TYPE_LABEL, MY_CLAIM_TABS } from '../constants/reimbursement.constants';
import { useExpenseFeatures } from '../hooks/useExpenseFeatures';
import { MY_EXPENSES_PATH } from '../hooks/useExpensesBasePath';
import { useMyExpenses } from '../hooks/useMyExpenses';
import type { ClaimDetail, CountAmount, MyOverview, MyWallet } from '../types/reimbursement.model';
import { belowZeroText, dateText, money, signedMoney, walletRoomText } from '../utils/format';
import { AskFundsDialog } from './components/AskFundsDialog';
import { ClaimCardList } from './components/ClaimCardList';
import { ExpenseFormDrawer } from './components/ExpenseFormDrawer';
import { ExportClaimsDialog } from './components/ExportDialogs';
import { Balance, FundStatusPill } from './components/StatusBadges';
import { Block, FeatureOff, primaryBtn, secondaryBtn } from './components/Primitives';

function WalletCard({ wallet, canAsk, onAsk }: { wallet: MyWallet; canAsk: boolean; onAsk: () => void }) {
  const negative = wallet.belowZero > 0 || wallet.balance < 0;
  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-surface p-5 shadow-[var(--tt-shadow-sm)]">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-fg-muted" />
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Expense wallet</p>
          </div>
          {wallet.status !== 'active' && <span className="rounded-full border border-dashed border-fg/40 px-2 py-0.5 text-[11px] font-semibold text-fg">{wallet.status === 'frozen' ? 'Frozen' : 'Closed'}</span>}
        </div>
        <p className={cx('mt-2 text-4xl font-extrabold tabular-nums', negative ? 'text-[var(--tt-danger)]' : 'text-fg')}>{money(wallet.balance)}</p>
        <p className={cx('mt-1 text-sm', negative ? 'font-medium text-[var(--tt-danger)]' : 'text-fg-muted')}>{belowZeroText(wallet.belowZero, money) ?? 'Balance'}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-bg-subtle px-3 py-2">
            <dt className="text-fg-muted">On hold</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-fg">{money(wallet.held)}</dd>
          </div>
          <div className="rounded-lg bg-bg-subtle px-3 py-2">
            <dt className="text-fg-muted">You can spend</dt>
            <dd className="mt-0.5 font-semibold">
              {wallet.spendable === null ? <span className="text-fg">No limit</span> : <Balance value={wallet.spendable} />}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-[11px] text-fg-muted">{walletRoomText(wallet, money)}.</p>
        {wallet.statusNote && <p className="mt-2 rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg">{wallet.statusNote}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {canAsk && (
          <button type="button" onClick={onAsk} className={cx(primaryBtn, 'flex-1')}>
            <HandCoins className="h-3.5 w-3.5" />
            Ask for funds
          </button>
        )}
        <Link href={`${MY_EXPENSES_PATH}/wallet`} className={cx(secondaryBtn, 'flex-1')}>
          Statement
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, figure, note }: { icon: LucideIcon; label: string; figure: CountAmount; note: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)]">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-xs font-semibold text-fg-muted">{label}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-xl font-extrabold leading-none tabular-nums text-fg sm:text-2xl">{money(figure.amount)}</div>
        <div className="mt-1.5 truncate text-xs text-fg-muted">
          {figure.count} {figure.count === 1 ? 'expense' : 'expenses'} · {note}
        </div>
      </div>
    </div>
  );
}

function Tiles({ o }: { o: MyOverview }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Tile icon={Hourglass} label="Waiting for approval" figure={o.counts.pending} note="In Approvals" />
      {o.features.claims && <Tile icon={Clock3} label="To be paid back" figure={o.counts.to_be_paid} note={o.policy.payoutMode === 'payroll' ? 'With your salary' : 'By Accounts'} />}
      {o.features.claims && <Tile icon={CheckCircle2} label="Paid back" figure={o.counts.paid} note="All time" />}
      {o.wallet && <Tile icon={Wallet} label="Spent from wallet" figure={o.counts.wallet_spent} note="Approved" />}
    </div>
  );
}

function RecentActivity({ wallet }: { wallet: MyWallet }) {
  return (
    <section className="rounded-xl border border-line bg-surface shadow-xs">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold text-fg">Wallet activity</h2>
        <Link href={`${MY_EXPENSES_PATH}/wallet`} className="text-xs font-semibold text-fg-muted hover:text-fg">
          See all
        </Link>
      </header>
      {wallet.openFundRequests.length > 0 && (
        <ul className="divide-y divide-line border-b border-line">
          {wallet.openFundRequests.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <span className="text-xs text-fg-muted">Asked {dateText(f.createdAt)}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-fg">{money(f.approvedAmount ?? f.amount)}</span>
                <FundStatusPill status={f.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {wallet.recent.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-fg-muted">No wallet activity yet.</p>
      ) : (
        <ol className="relative mx-4 my-4 space-y-3.5 border-l border-line pl-4">
          {wallet.recent.map((e) => (
            <li key={e.id} className="relative">
              <span aria-hidden className={cx('absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ring-4 ring-surface', e.amount >= 0 ? 'bg-fg' : 'border border-fg bg-surface')} />
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-semibold text-fg sm:text-sm">{e.ref?.title || e.note || LEDGER_TYPE_LABEL[e.type]}</p>
                <p className="shrink-0 text-xs font-bold tabular-nums text-fg sm:text-sm">{signedMoney(e.amount, money)}</p>
              </div>
              <p className="text-[11px] text-fg-muted">
                {dateText(e.date)} · {LEDGER_TYPE_LABEL[e.type]}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const EMPTY_COPY: Record<string, { title: string; description: string }> = {
  all: { title: 'No expenses yet', description: 'Add what you spent for work, attach the receipts and send it for approval.' },
  draft: { title: 'No drafts', description: 'Expenses you save without sending stay here until you submit them.' },
  pending: { title: 'Nothing waiting', description: 'Submitted expenses wait here until they are approved.' },
  to_pay: { title: 'Nothing to be paid', description: 'Approved claims wait here until they are paid back.' },
  paid: { title: 'Nothing paid yet', description: 'Claims paid back to you are kept here.' },
  rejected: { title: 'Nothing rejected', description: 'Rejected expenses show here with the reason.' },
};

export function MyExpensesPage() {
  const f = useExpenseFeatures();
  if (!f.any) return <FeatureOff what="Expenses" />;
  return <MyExpenses />;
}

function MyExpenses() {
  const router = useRouter();
  const m = useMyExpenses();
  const [creating, setCreating] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const o = m.overview;
  const canCreate = Boolean(o && o.enabled && o.channels.length && o.categories.length);
  const { refresh } = m;

  const onSaved = React.useCallback(
    (detail: ClaimDetail) => {
      setCreating(false);
      refresh();
      router.push(`${MY_EXPENSES_PATH}/${detail.id}`);
    },
    [refresh, router]
  );

  const empty = EMPTY_COPY[m.tab] || EMPTY_COPY.all;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-fg sm:text-2xl">My expenses</h1>
          <p className="text-sm text-fg-muted">
            {o?.wallet && o.features.claims ? 'Spend from your expense wallet or claim back what you paid yourself.' : o?.wallet ? 'Record what you spend from your expense wallet.' : 'Claim back what you spent for work.'}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button type="button" onClick={() => setDownloading(true)} className={cx(secondaryBtn, 'h-10 flex-1 px-4 sm:flex-none')}>
            <Download className="h-4 w-4" />
            Download
          </button>
          <button type="button" onClick={() => setCreating(true)} disabled={!canCreate} className={cx(primaryBtn, 'h-10 flex-1 px-4 sm:flex-none')}>
            <Plus className="h-4 w-4" />
            New expense
          </button>
        </div>
      </header>

      {m.overviewError && <p role="alert" className="text-sm font-medium text-[var(--tt-danger)]">{m.overviewError}</p>}
      {o && !o.enabled && <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm text-fg-muted">Expenses are not part of your policy yet. Ask HR to switch them on for you.</p>}
      {o && o.enabled && o.policy.submitWithinDays > 0 && (
        <p className="text-xs text-fg-muted">Submit expenses within {o.policy.submitWithinDays} days of spending.</p>
      )}

      {m.overviewLoading ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Block className="h-56 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Block key={i} className="h-[104px] rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        o && (
          <div className={cx('grid gap-3', o.wallet && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]')}>
            {o.wallet && <WalletCard wallet={o.wallet} canAsk={o.policy.fundRequests && o.wallet.status !== 'closed'} onAsk={() => setAsking(true)} />}
            <Tiles o={o} />
          </div>
        )
      )}

      <div className={cx('grid gap-3', o?.wallet && 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')}>
        <section className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
            <h2 className="text-sm font-bold text-fg sm:text-base">Expenses</h2>
            <div className="overflow-x-auto tt-scroll-hidden">
              <SegmentedControl options={MY_CLAIM_TABS} value={m.tab} onChange={m.setTab} fitText />
            </div>
          </div>
          {m.listError && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{m.listError}</p>}
          {m.listLoading ? (
            <TableSkeleton rows={4} columns={3} />
          ) : m.rows.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                illustration={m.tab === 'paid' || m.tab === 'to_pay' ? ILLUSTRATIONS.credit : m.tab === 'pending' ? ILLUSTRATIONS.approvals : ILLUSTRATIONS.debits}
                title={empty.title}
                description={empty.description}
                action={m.tab === 'all' && canCreate ? { label: 'New expense', onClick: () => setCreating(true) } : undefined}
              />
            </div>
          ) : (
            <>
              <div className={cx('divide-y divide-line transition-opacity duration-200', m.listFetching ? 'opacity-70' : 'opacity-100')}>
                <ClaimCardList rows={m.rows} href={(id) => `${MY_EXPENSES_PATH}/${id}`} showChannel={Boolean(o && o.channels.length > 1)} />
              </div>
              {m.total > m.pageSize && (
                <div className="mt-auto border-t border-line px-4 py-2.5">
                  <Pagination currentPage={m.page} totalPages={m.totalPages} totalItems={m.total} pageSize={m.pageSize} onPageChange={m.setPage} />
                </div>
              )}
            </>
          )}
        </section>
        {o?.wallet && <RecentActivity wallet={o.wallet} />}
      </div>

      {o && (
        <ExpenseFormDrawer
          mode="me"
          open={creating}
          onClose={() => setCreating(false)}
          onSaved={onSaved}
          categories={o.categories}
          channels={o.channels}
          wallet={o.wallet}
          today={o.today}
          receiptScan={o.policy.receiptScan}
        />
      )}
      <ExportClaimsDialog open={downloading} onClose={() => setDownloading(false)} scope="me" initial={{ status: m.tab === 'all' ? '' : m.tab }} categories={o?.categories} />
      {o?.wallet && <AskFundsDialog open={asking} balance={o.wallet.balance} onClose={() => setAsking(false)} onDone={refresh} />}
    </div>
  );
}
