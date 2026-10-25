'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Lock, LockOpen, Minus, Plus, RotateCcw, Scale, XCircle } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { ILLUSTRATIONS, REIMB_PERMISSIONS, WALLETS_ACCESS, WALLET_EXPORT_ACCESS } from '../constants/reimbursement.constants';
import { useExpenseFeatures } from '../hooks/useExpenseFeatures';
import { useExpensesBasePath } from '../hooks/useExpensesBasePath';
import { useWalletDetail } from '../hooks/useWalletDetail';
import type { Wallet } from '../types/reimbursement.model';
import { belowZeroText, dateText, initials, money, walletRoomText } from '../utils/format';
import { DateRange } from '@/features/expense-bills/components/DateRange';
import { ExportStatementDialog } from './components/ExportDialogs';
import { LedgerList } from './components/LedgerList';
import { Balance, WalletStatusPill } from './components/StatusBadges';
import { WalletActionDialog, type WalletAction } from './components/WalletDialogs';
import { Block, FeatureOff, NoAccess } from './components/Primitives';
import { FundRequestsPanel } from './WalletsPage';

export function WalletDetailPage({ walletId }: { walletId: number }) {
  const f = useExpenseFeatures();
  const { canAny } = usePermission();
  if (!f.wallet) return <FeatureOff what="Expense wallets" />;
  if (!canAny(WALLETS_ACCESS)) return <NoAccess what="expense wallets" />;
  return <Detail walletId={walletId} />;
}

export function WalletFigures({ wallet }: { wallet: Wallet }) {
  const items: Array<[string, React.ReactNode, string]> = [
    ['Balance', <Balance key="b" value={wallet.balance} />, wallet.belowZero > 0 ? `${money(wallet.belowZero)} below zero` : 'With the employee'],
    ['On hold', money(wallet.held), 'Expenses waiting for approval'],
    ['Available', <Balance key="a" value={wallet.available} />, 'Balance minus on hold'],
    ['Can spend', wallet.spendable === null ? <span key="s" className="text-fg">No limit</span> : <Balance key="s" value={wallet.spendable} />, walletRoomText(wallet, money)],
  ];
  const beyond = belowZeroText(wallet.belowZero, money);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(([label, value, note]) => (
          <div key={label} className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)]">
            <p className="text-xs font-semibold text-fg-muted">{label}</p>
            <p className="mt-1.5 truncate text-2xl font-extrabold tabular-nums">{value}</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">{note}</p>
          </div>
        ))}
      </div>
      {beyond && <p className="px-1 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{beyond}.</p>}
    </div>
  );
}

function Detail({ walletId }: { walletId: number }) {
  const base = useExpensesBasePath();
  const { can, canAny } = usePermission();
  const w = useWalletDetail(walletId);
  const [action, setAction] = React.useState<WalletAction | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const d = w.detail;

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 pb-8">
      <Link href={`${base}/wallets`} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-fg-muted transition-colors hover:text-fg sm:text-sm">
        <ArrowLeft className="h-3.5 w-3.5" />
        All wallets
      </Link>
      {w.isLoading ? (
        <div className="flex flex-col gap-3">
          <Block className="h-24 rounded-xl" />
          <Block className="h-24 rounded-xl" />
          <Block className="h-80 rounded-xl" />
        </div>
      ) : !d ? (
        <div className="rounded-xl border border-line bg-surface p-6">
          <EmptyState
            illustration={ILLUSTRATIONS.debits}
            title={w.notFound ? 'Wallet not found' : 'Could not load this wallet'}
            description={w.notFound ? 'It belongs to a company you cannot see, or it does not exist.' : w.error}
            action={w.notFound ? undefined : { label: 'Try again', onClick: w.refetch, variant: 'link' }}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fg text-sm font-bold text-[var(--tt-on-primary)]">{initials(d.wallet.employee.name)}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-base font-bold text-fg sm:text-lg">{d.wallet.employee.name}</h1>
                  <WalletStatusPill status={d.wallet.status} />
                </div>
                <p className="truncate text-xs text-fg-muted sm:text-sm">
                  {[d.wallet.employee.code, d.wallet.employee.department, `Opened ${dateText(d.wallet.openedAt)}`].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {d.can.fund && (
                <>
                  <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAction('top_up')}>
                    Top up
                  </Btn>
                  <Btn icon={<Minus className="h-3.5 w-3.5" />} disabled={d.wallet.balance <= 0} onClick={() => setAction('return')}>
                    Take back
                  </Btn>
                  <Btn icon={<Scale className="h-3.5 w-3.5" />} onClick={() => setAction('adjust')}>
                    Adjust
                  </Btn>
                </>
              )}
              {d.can.freeze && d.wallet.status === 'active' && (
                <Btn icon={<Lock className="h-3.5 w-3.5" />} onClick={() => setAction('freeze')}>
                  Freeze
                </Btn>
              )}
              {d.can.freeze && d.wallet.status === 'frozen' && (
                <Btn icon={<LockOpen className="h-3.5 w-3.5" />} onClick={() => setAction('unfreeze')}>
                  Unfreeze
                </Btn>
              )}
              {d.can.close && (
                <Btn icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => setAction('close')}>
                  Close
                </Btn>
              )}
              {d.can.reopen && (
                <Btn variant="primary" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setAction('reopen')}>
                  Reopen
                </Btn>
              )}
            </div>
          </div>
          {d.wallet.statusNote && <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg sm:text-sm">{d.wallet.statusNote}</p>}

          <WalletFigures wallet={d.wallet} />

          <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
              <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-bold text-fg">Statement</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <DateRange value={w.range} onChange={w.setRange} />
                  {canAny(WALLET_EXPORT_ACCESS) && (
                    <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => setExporting(true)}>
                      Statement
                    </Btn>
                  )}
                </div>
              </div>
              {w.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)]">{w.error}</p>}
              {d.ledger.length === 0 ? (
                <div className="p-6">
                  <EmptyState compact illustration={ILLUSTRATIONS.debits} title="No entries" description={w.range.from || w.range.to ? 'Nothing in these dates.' : 'Top-ups and expenses will show here.'} />
                </div>
              ) : (
                <div className={cx('transition-opacity duration-200', w.isFetching ? 'opacity-70' : 'opacity-100')}>
                  <LedgerList entries={d.ledger} claimHref={(id) => `${base}/claims/${id}`} />
                </div>
              )}
              {d.ledgerTotal > w.pageSize && (
                <div className="mt-auto border-t border-line px-4 py-2.5">
                  <Pagination currentPage={w.page} totalPages={w.totalPages} totalItems={d.ledgerTotal} pageSize={w.pageSize} onPageChange={w.setPage} />
                </div>
              )}
            </section>
            <FundRequestsPanel walletId={d.wallet.id} canPay={can(REIMB_PERMISSIONS.WALLET_TOPUP)} onPaid={w.refetch} />
          </div>

          <WalletActionDialog action={action} wallet={d.wallet} onClose={() => setAction(null)} onDone={w.refetch} />
          <ExportStatementDialog open={exporting} onClose={() => setExporting(false)} scope="hr" walletId={d.wallet.id} employeeName={d.wallet.employee.name} />
        </>
      )}
    </div>
  );
}
