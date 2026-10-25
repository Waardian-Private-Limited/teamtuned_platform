'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, HandCoins } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/reimbursement.api';
import { ILLUSTRATIONS } from '../constants/reimbursement.constants';
import { useExpenseFeatures } from '../hooks/useExpenseFeatures';
import { MY_EXPENSES_PATH } from '../hooks/useExpensesBasePath';
import { useMyWallet } from '../hooks/useMyWallet';
import type { FundRequest } from '../types/reimbursement.model';
import { money } from '../utils/format';
import { AskFundsDialog } from './components/AskFundsDialog';
import { ConfirmDialog } from './components/ClaimDialogs';
import { DateRange } from '@/features/expense-bills/components/DateRange';
import { ExportStatementDialog } from './components/ExportDialogs';
import { FundRequestList } from './components/FundRequestList';
import { LedgerList } from './components/LedgerList';
import { Block, FeatureOff } from './components/Primitives';
import { WalletFigures } from './WalletDetailPage';

export function MyWalletPage() {
  const f = useExpenseFeatures();
  if (!f.wallet) return <FeatureOff what="The expense wallet" />;
  return <MyWallet />;
}

function MyWallet() {
  const w = useMyWallet();
  const [asking, setAsking] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [withdrawing, setWithdrawing] = React.useState<FundRequest | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [withdrawError, setWithdrawError] = React.useState('');
  const s = w.statement;
  const wallet = s.data?.wallet ?? null;
  const canAsk = Boolean(s.data?.fundRequests && wallet && wallet.status !== 'closed');
  const { refresh } = w;

  const withdraw = async () => {
    if (!withdrawing) return;
    setBusy(true);
    setWithdrawError('');
    try {
      await api.cancelMyFundRequest(withdrawing.id);
      showSuccess('Request withdrawn');
      setWithdrawing(null);
      refresh();
    } catch (err) {
      setWithdrawError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 pb-8">
      <Link href={MY_EXPENSES_PATH} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-fg-muted transition-colors hover:text-fg sm:text-sm">
        <ArrowLeft className="h-3.5 w-3.5" />
        My expenses
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-fg sm:text-2xl">Wallet statement</h1>
          <p className="text-sm text-fg-muted">Every top-up and expense, with your balance before and after each one.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {wallet && (
            <Btn icon={<Download className="h-4 w-4" />} onClick={() => setDownloading(true)} className="flex-1 sm:flex-none">
              Download statement
            </Btn>
          )}
          {canAsk && (
            <Btn variant="primary" icon={<HandCoins className="h-4 w-4" />} onClick={() => setAsking(true)} className="flex-1 sm:flex-none">
              Ask for funds
            </Btn>
          )}
        </div>
      </header>

      {s.isLoading ? (
        <Block className="h-24 rounded-xl" />
      ) : !wallet ? (
        <div className="rounded-xl border border-line bg-surface p-6">
          <EmptyState illustration={ILLUSTRATIONS.debits} title={s.notFound ? 'You do not have an expense wallet' : 'Could not load your wallet'} description={s.notFound ? 'HR opens a wallet for employees who spend company money.' : s.error} />
        </div>
      ) : (
        <WalletFigures wallet={wallet} />
      )}

      {wallet && (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
            <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-bold text-fg">Statement</h2>
              <DateRange value={w.range} onChange={w.setRange} />
            </div>
            {s.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)]">{s.error}</p>}
            {!s.data?.entries.length ? (
              <div className="p-6">
                <EmptyState compact illustration={ILLUSTRATIONS.debits} title="No entries" description={w.range.from || w.range.to ? 'Nothing in these dates.' : 'Top-ups and expenses will show here.'} />
              </div>
            ) : (
              <div className={cx('transition-opacity duration-200', s.isFetching ? 'opacity-70' : 'opacity-100')}>
                <LedgerList entries={s.data.entries} claimHref={(id) => `${MY_EXPENSES_PATH}/${id}`} />
              </div>
            )}
            {(s.data?.total ?? 0) > w.pageSize && (
              <div className="mt-auto border-t border-line px-4 py-2.5">
                <Pagination currentPage={w.page} totalPages={w.totalPages} totalItems={s.data?.total ?? 0} pageSize={w.pageSize} onPageChange={w.setPage} />
              </div>
            )}
          </section>
          <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
            <h2 className="border-b border-line p-3 text-sm font-bold text-fg">Fund requests</h2>
            {w.requests.isLoading ? (
              <TableSkeleton rows={3} columns={2} />
            ) : !w.requests.data?.length ? (
              <div className="p-6">
                <EmptyState compact illustration={ILLUSTRATIONS.approvals} title="No requests" description={canAsk ? 'Running low? Ask for funds and HR tops up your wallet once it is approved.' : 'Requests you send show here.'} />
              </div>
            ) : (
              <FundRequestList
                rows={w.requests.data}
                scope="me"
                action={(r) =>
                  r.status === 'pending' ? (
                    <Btn onClick={() => { setWithdrawError(''); setWithdrawing(r); }}>
                      Withdraw
                    </Btn>
                  ) : null
                }
              />
            )}
          </section>
        </div>
      )}

      {wallet && <ExportStatementDialog open={downloading} onClose={() => setDownloading(false)} scope="me" />}
      {wallet && <AskFundsDialog open={asking} balance={wallet.balance} onClose={() => setAsking(false)} onDone={refresh} />}
      <ConfirmDialog
        open={Boolean(withdrawing)}
        title="Withdraw this request?"
        message={withdrawing ? `${money(withdrawing.amount)} is taken out of approval.` : ''}
        confirmLabel="Withdraw"
        danger
        busy={busy}
        error={withdrawError}
        onClose={() => setWithdrawing(null)}
        onConfirm={withdraw}
      />
    </div>
  );
}
