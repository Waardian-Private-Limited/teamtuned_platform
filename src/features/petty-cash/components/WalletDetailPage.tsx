'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator, Download, Pencil } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { DateRange } from '@/features/expense-bills/components/DateRange';
import { useMutation } from '@/features/reimbursement/hooks/useClaimActions';
import * as api from '../api/petty-cash.api';
import { FUND_ACTIONS, ILLUSTRATIONS, PC, STATEMENT_ACCESS, WALLETS_ACCESS } from '../constants/petty-cash.constants';
import { usePettyCashAccess } from '../hooks/usePettyCashAccess';
import { usePettyCashBasePath } from '../hooks/usePettyCashBasePath';
import { useWalletDetail } from '../hooks/useWalletDetail';
import type { FundRequest } from '../types/petty-cash.model';
import { CashCountDialog } from './components/CashCountDialog';
import { ExportStatementDialog } from './components/ExportStatementDialog';
import { FundPayDialog } from './components/FundDialogs';
import { FundRequestList } from './components/FundRequestList';
import { LedgerList } from './components/LedgerList';
import { leftoverError } from '../utils/formError';
import { Block, FormError, Gate, Panel, secondaryBtn } from './components/Primitives';
import { AdjustDialog, ReturnDialog, StateDialog, TopUpDialog } from './components/WalletActionDialogs';
import { WalletFormDrawer } from './components/WalletFormDialog';
import { CashCountList, CustodianList, WalletPosition } from './components/WalletParts';

export function WalletDetailPage({ id }: { id: number }) {
  const { enabled, canAny } = usePettyCashAccess();
  return (
    <Gate enabled={enabled} allowed={canAny(WALLETS_ACCESS)} what="this petty cash wallet">
      <WalletDetail id={id} />
    </Gate>
  );
}

type Dialog = 'top_up' | 'return' | 'adjust' | 'count' | 'edit' | 'statement' | null;

function WalletDetail({ id }: { id: number }) {
  const base = usePettyCashBasePath();
  const { can, canAny } = usePettyCashAccess();
  const w = useWalletDetail(id, 'hr');
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [state, setState] = React.useState<'freeze' | 'unfreeze' | 'close' | 'reopen' | null>(null);
  const [paying, setPaying] = React.useState<FundRequest | null>(null);
  const [posting, setPosting] = React.useState<number | null>(null);
  const { refetch } = w;
  const adjustMutation = useMutation(refetch);

  const back = (
    <Link href={`${base}/wallets`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-fg sm:text-sm">
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      All wallets
    </Link>
  );

  if (w.isLoading) {
    return (
      <div className="space-y-3">
        {back}
        <Block className="h-48 w-full rounded-xl" />
        <Block className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!w.detail) {
    return (
      <div className="space-y-3">
        {back}
        <div className="flex items-center justify-center rounded-xl border border-line bg-surface p-6">
          <EmptyState illustration={ILLUSTRATIONS.notFound} title={w.notFound ? 'Wallet not found' : 'Could not load the wallet'} description={w.notFound ? 'It may have been removed, or it belongs to another company.' : w.error} />
        </div>
      </div>
    );
  }

  const { wallet, ledger, ledgerTotal, openFundRequests, cashCounts } = w.detail;
  // Money routes take PC_FUND or PC_ADMIN; the wallet's own `can` says the same once loaded.
  const funder = canAny(FUND_ACTIONS);
  const canFund = (funder || wallet.can.fund) && wallet.status !== 'closed';
  const admin = can(PC.ADMIN) || wallet.can.manage;
  const actions = (
    <>
      {canFund && <Btn variant="primary" onClick={() => setDialog('top_up')}>Top up</Btn>}
      {canFund && <Btn onClick={() => setDialog('return')}>Return cash</Btn>}
      {canFund && <Btn onClick={() => setDialog('adjust')}>Adjust</Btn>}
      {wallet.can.count && wallet.status !== 'closed' && <Btn icon={<Calculator className="h-3.5 w-3.5" />} onClick={() => setDialog('count')}>Count cash</Btn>}
      {admin && wallet.status === 'active' && <Btn onClick={() => setState('freeze')}>Freeze</Btn>}
      {admin && wallet.status === 'frozen' && <Btn onClick={() => setState('unfreeze')}>Unfreeze</Btn>}
      {admin && wallet.status !== 'closed' && <Btn onClick={() => setState('close')}>Close</Btn>}
      {(can(PC.ADMIN) || wallet.can.reopen) && wallet.status === 'closed' && <Btn onClick={() => setState('reopen')}>Reopen</Btn>}
      {admin && wallet.status !== 'closed' && <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setDialog('edit')}>Edit</Btn>}
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {back}
      {w.error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{w.error}</p>}
      <WalletPosition wallet={wallet} actions={actions} />
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="min-w-0 space-y-3 lg:col-span-2">
          <Panel
            title="Ledger"
            flush
            aside={
              <div className="flex flex-wrap items-center gap-2">
                <DateRange value={w.range} onChange={w.setRange} />
                {canAny(STATEMENT_ACCESS) && (
                  <button type="button" onClick={() => setDialog('statement')} className={secondaryBtn}>
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Statement
                  </button>
                )}
              </div>
            }
          >
            {ledger.length === 0 ? (
              <div className="p-6">
                <EmptyState compact illustration={ILLUSTRATIONS.ledger} title="No entries" description="Nothing has moved in this wallet for these dates." />
              </div>
            ) : (
              <div className={cx('transition-opacity duration-200', w.isFetching ? 'opacity-70' : 'opacity-100')}>
                <LedgerList entries={ledger} expenseHref={(eid) => `${base}/expenses/${eid}`} />
                {ledgerTotal > w.pageSize && (
                  <div className="border-t border-line px-4 py-2.5">
                    <Pagination currentPage={w.page} totalPages={w.totalPages} totalItems={ledgerTotal} pageSize={w.pageSize} onPageChange={w.setPage} />
                  </div>
                )}
              </div>
            )}
          </Panel>
          <Panel title="Open fund requests" flush>
            {openFundRequests.length === 0 ? (
              <p className="p-4 text-sm text-fg-muted sm:p-5">No fund request is open for this wallet.</p>
            ) : (
              <FundRequestList rows={openFundRequests} action={(r) => (funder && r.status === 'approved' ? <Btn variant="primary" onClick={() => setPaying(r)}>Pay</Btn> : null)} />
            )}
          </Panel>
        </div>
        <div className="min-w-0 space-y-3">
          <CustodianList wallet={wallet} />
          <Panel title="Cash counts">
            <CashCountList
              counts={cashCounts}
              action={(c) =>
                funder && wallet.can.count ? (
                  <Btn busy={adjustMutation.busy && posting === c.id} disabled={adjustMutation.busy} onClick={() => { setPosting(c.id); adjustMutation.run(() => api.adjustCashCount(wallet.id, c.id), 'Difference posted to the ledger'); }}>
                    Post difference
                  </Btn>
                ) : null
              }
            />
            <FormError message={leftoverError(adjustMutation.error, [])} className="mt-2" />
          </Panel>
        </div>
      </div>

      <TopUpDialog wallet={wallet} open={dialog === 'top_up'} onClose={() => setDialog(null)} onDone={refetch} />
      <ReturnDialog wallet={wallet} open={dialog === 'return'} onClose={() => setDialog(null)} onDone={refetch} />
      <AdjustDialog wallet={wallet} open={dialog === 'adjust'} onClose={() => setDialog(null)} onDone={refetch} />
      <StateDialog wallet={wallet} action={state} onClose={() => setState(null)} onDone={refetch} />
      <CashCountDialog open={dialog === 'count'} onClose={() => setDialog(null)} onDone={refetch} walletId={wallet.id} bookBalance={wallet.balance} scope="hr" />
      <WalletFormDrawer open={dialog === 'edit'} wallet={wallet} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); refetch(); }} />
      <ExportStatementDialog open={dialog === 'statement'} onClose={() => setDialog(null)} walletId={wallet.id} range={w.range} />
      <FundPayDialog request={paying} onClose={() => setPaying(null)} onDone={() => { setPaying(null); refetch(); }} />
    </div>
  );
}
