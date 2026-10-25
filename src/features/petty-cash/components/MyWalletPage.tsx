'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator, HandCoins, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { useRouter } from 'next/navigation';
import { ILLUSTRATIONS, PC } from '../constants/petty-cash.constants';
import { usePettyCashAccess } from '../hooks/usePettyCashAccess';
import { MY_PETTY_CASH_PATH } from '../hooks/usePettyCashBasePath';
import { useWalletDetail } from '../hooks/useWalletDetail';
import { CashCountDialog } from './components/CashCountDialog';
import { ExpenseFormDrawer } from './components/ExpenseFormDrawer';
import { ReceiveGoodsDialog } from './components/ReceiveGoodsDialog';
import { useReceiveAfterSave } from '../hooks/useReceiveAfterSave';
import { AskFundsDialog } from './components/FundDialogs';
import { FundRequestList } from './components/FundRequestList';
import { LedgerList } from './components/LedgerList';
import { Block, Gate, Panel } from './components/Primitives';
import { CashCountList, CustodianList, WalletPosition } from './components/WalletParts';

/** One wallet the employee may spend from; custodians also see its ledger, cash counts and open requests. */
export function MyWalletPage({ id }: { id: number }) {
  const { enabled, canAny } = usePettyCashAccess();
  return (
    <Gate enabled={enabled} allowed={canAny([PC.SPEND])} what="this petty cash wallet">
      <MyWallet id={id} />
    </Gate>
  );
}

type Dialog = 'ask' | 'count' | 'expense' | null;

function MyWallet({ id }: { id: number }) {
  const router = useRouter();
  const w = useWalletDetail(id, 'me');
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const { refetch } = w;
  const afterSave = React.useCallback((d: { id: number }) => router.push(`${MY_PETTY_CASH_PATH}/expenses/${d.id}`), [router]);
  const receive = useReceiveAfterSave(afterSave);
  const back = (
    <Link href={MY_PETTY_CASH_PATH} className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-fg sm:text-sm">
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      My petty cash
    </Link>
  );

  if (w.isLoading) {
    return (
      <div className="space-y-3">
        {back}
        <Block className="h-48 w-full rounded-xl" />
      </div>
    );
  }
  if (!w.detail) {
    return (
      <div className="space-y-3">
        {back}
        <div className="flex items-center justify-center rounded-xl border border-line bg-surface p-6">
          <EmptyState illustration={ILLUSTRATIONS.notFound} title={w.notFound ? 'Wallet not found' : 'Could not load the wallet'} description={w.notFound ? 'You may not be able to spend from this wallet.' : w.error} />
        </div>
      </div>
    );
  }

  const { wallet, ledger, ledgerTotal, openFundRequests, cashCounts, isCustodian } = w.detail;
  const canSpend = wallet.status === 'active';
  const actions = (
    <>
      <Btn variant="primary" disabled={!canSpend} icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDialog('expense')}>Add expense</Btn>
      {wallet.can.askFunds && <Btn icon={<HandCoins className="h-3.5 w-3.5" />} onClick={() => setDialog('ask')}>Ask for funds</Btn>}
      {wallet.can.count && <Btn icon={<Calculator className="h-3.5 w-3.5" />} onClick={() => setDialog('count')}>Count cash</Btn>}
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {back}
      {w.error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{w.error}</p>}
      <WalletPosition wallet={wallet} actions={actions} />
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="min-w-0 space-y-3 lg:col-span-2">
          {isCustodian ? (
            <>
              <Panel title="Ledger" flush>
                {ledger.length === 0 ? (
                  <div className="p-6">
                    <EmptyState compact illustration={ILLUSTRATIONS.ledger} title="No entries" description="Nothing has moved in this wallet yet." />
                  </div>
                ) : (
                  <div className={cx('transition-opacity duration-200', w.isFetching ? 'opacity-70' : 'opacity-100')}>
                    <LedgerList entries={ledger} expenseHref={(eid) => `${MY_PETTY_CASH_PATH}/expenses/${eid}`} />
                    {ledgerTotal > w.pageSize && (
                      <div className="border-t border-line px-4 py-2.5">
                        <Pagination currentPage={w.page} totalPages={w.totalPages} totalItems={ledgerTotal} pageSize={w.pageSize} onPageChange={w.setPage} />
                      </div>
                    )}
                  </div>
                )}
              </Panel>
              <Panel title="Open fund requests" flush>
                {openFundRequests.length === 0 ? <p className="p-4 text-sm text-fg-muted sm:p-5">No fund request is open.</p> : <FundRequestList rows={openFundRequests} showRequester={false} />}
              </Panel>
            </>
          ) : (
            <Panel title="Your spending here">
              <p className="text-sm text-fg-muted">You can add expenses against this wallet. The custodians look after its cash and ledger.</p>
            </Panel>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <CustodianList wallet={wallet} />
          {isCustodian && (
            <Panel title="Cash counts">
              <CashCountList counts={cashCounts} />
            </Panel>
          )}
        </div>
      </div>

      <AskFundsDialog open={dialog === 'ask'} onClose={() => setDialog(null)} onDone={refetch} wallet={wallet} />
      <CashCountDialog open={dialog === 'count'} onClose={() => setDialog(null)} onDone={refetch} walletId={wallet.id} bookBalance={wallet.balance} scope="me" />
      <ExpenseFormDrawer open={dialog === 'expense'} onClose={() => setDialog(null)} mode="me" walletId={wallet.id} onSaved={(d) => { setDialog(null); receive.handle(d); }} />
      <ReceiveGoodsDialog {...receive.dialogProps} />
    </div>
  );
}
