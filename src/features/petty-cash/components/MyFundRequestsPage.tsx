'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { ConfirmDialog } from '@/features/reimbursement/components/components/ClaimDialogs';
import { useMutation } from '@/features/reimbursement/hooks/useClaimActions';
import * as api from '../api/petty-cash.api';
import { ILLUSTRATIONS } from '../constants/petty-cash.constants';
import { useMyFundRequests } from '../hooks/useMyFundRequests';
import { MY_PETTY_CASH_PATH } from '../hooks/usePettyCashBasePath';
import type { FundRequest } from '../types/petty-cash.model';
import { leftoverError } from '../utils/formError';
import { FundRequestList } from './components/FundRequestList';

/** The employee's own fund requests, with Withdraw for the ones still waiting. */
export function MyFundRequestsPage() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace(`${MY_PETTY_CASH_PATH}?tab=fund-requests`);
  }, [router]);
  return null;
}

/** Embedded in the Fund requests tab of My petty cash. */
export function MyFundRequests() {
  const fr = useMyFundRequests();
  const [withdrawing, setWithdrawing] = React.useState<FundRequest | null>(null);
  const { refetch } = fr;
  const done = React.useCallback(() => {
    setWithdrawing(null);
    refetch();
  }, [refetch]);
  const m = useMutation(done);
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <p className="text-xs text-fg-muted sm:text-sm">Cash you asked for on your petty cash wallets.</p>
      <section className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {fr.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{fr.error}</p>}
        {fr.isLoading ? (
          <TableSkeleton rows={4} columns={4} />
        ) : fr.rows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState illustration={ILLUSTRATIONS.funds} title="No fund requests yet" description="Custodians can ask for more cash from their wallet page." />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <FundRequestList rows={fr.rows} showRequester={false} action={(r) => (r.status === 'pending' ? <Btn onClick={() => { m.clearError(); setWithdrawing(r); }}>Withdraw</Btn> : null)} />
            {fr.total > fr.pageSize && (
              <div className="border-t border-line px-4 py-2.5">
                <Pagination currentPage={fr.page} totalPages={fr.totalPages} totalItems={fr.total} pageSize={fr.pageSize} onPageChange={fr.setPage} />
              </div>
            )}
          </div>
        )}
      </section>
      {/* Stays open on a failed withdraw so the reason is shown. */}
      <ConfirmDialog
        open={withdrawing !== null}
        title="Withdraw this request?"
        message={withdrawing ? `The request for ${withdrawing.wallet.name} is cancelled. You can ask again later.` : ''}
        confirmLabel="Withdraw"
        danger
        busy={m.busy}
        error={leftoverError(m.error, [])}
        onClose={() => setWithdrawing(null)}
        onConfirm={() => withdrawing && m.run(() => api.cancelMyFundRequest(withdrawing.id), 'Request withdrawn')}
      />
    </div>
  );
}
