'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Ban, Banknote, ClipboardCheck, Pencil, Repeat2, Undo2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { RequestDrawer } from '@/features/approvals/components/RequestDrawer';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/reimbursement.api';
import { CLAIMS_ACCESS, CLAIMS_EXPORT_ACCESS, ILLUSTRATIONS, REIMB_PERMISSIONS } from '../constants/reimbursement.constants';
import { useClaimActions } from '../hooks/useClaimActions';
import { useClaimDetail } from '../hooks/useClaimDetail';
import { useExpenseFeatures } from '../hooks/useExpenseFeatures';
import { MY_EXPENSES_PATH, useExpensesBasePath } from '../hooks/useExpensesBasePath';
import { useRemote } from '../hooks/useRemote';
import { toMyOverview } from '../types/reimbursement.mapper';
import type { ClaimDetail } from '../types/reimbursement.model';
import { money } from '../utils/format';
import { CancelClaimDialog, ConfirmDialog, PayDialog, PayoutModeDialog } from './components/ClaimDialogs';
import { AmountStrip, ApprovalSteps, ClaimDetailSkeleton, ClaimFacts, ClaimHeader, ClaimHistory, ClaimLines, PaymentProof } from './components/ClaimDetailSections';
import { ExpenseFormDrawer } from './components/ExpenseFormDrawer';
import { ClaimExportButton } from './components/ExportDialogs';
import { PaperBillPanel, waitsForPaperBill } from './components/PaperBill';
import { FeatureOff, Panel } from './components/Primitives';

function Missing({ notFound, error, onRetry }: { notFound: boolean; error: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <EmptyState
        illustration={ILLUSTRATIONS.review}
        title={notFound ? 'Expense not found' : 'Could not load this expense'}
        description={notFound ? 'It may have been deleted, or it belongs to a company you cannot see.' : error}
        action={notFound ? undefined : { label: 'Try again', onClick: onRetry, variant: 'link' }}
      />
    </div>
  );
}

function Body({ detail, scope, aside }: { detail: ClaimDetail; scope: 'me' | 'hr'; aside?: React.ReactNode }) {
  return (
    <>
      <AmountStrip detail={detail} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <Panel title="Expenses" flush aside={<span className="text-xs text-fg-muted">{detail.lineCount} {detail.lineCount === 1 ? 'line' : 'lines'}</span>}>
            <ClaimLines detail={detail} scope={scope} />
          </Panel>
          <Panel title="History">
            <ClaimHistory events={detail.history} />
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {aside}
          {detail.approval && (
            <Panel title="Approval">
              <ApprovalSteps approval={detail.approval} />
            </Panel>
          )}
          <Panel title="Details">
            <ClaimFacts detail={detail} />
          </Panel>
          {detail.status === 'paid' && (
            <Panel title="Payment">
              <PaymentProof detail={detail} scope={scope} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

// ── Employee ────────────────────────────────────────────────────────────────

export function MyClaimPage({ claimId }: { claimId: number }) {
  const f = useExpenseFeatures();
  if (!f.any) return <FeatureOff what="Expenses" />;
  return <MyClaim claimId={claimId} />;
}

function MyClaim({ claimId }: { claimId: number }) {
  const router = useRouter();
  const { detail, isLoading, error, notFound, refetch } = useClaimDetail(claimId, 'me');
  const isDraft = detail?.status === 'draft';
  const overviewFetcher = React.useCallback(async () => toMyOverview(await api.getMyOverview()), []);
  const overview = useRemote(isDraft ? overviewFetcher : null, isDraft ? 'overview' : '');
  const [editing, setEditing] = React.useState(false);
  const [withdrawing, setWithdrawing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [withdrawError, setWithdrawError] = React.useState('');

  const withdraw = async () => {
    if (!detail) return;
    setBusy(true);
    setWithdrawError('');
    try {
      await api.cancelMyClaim(detail.id);
      showSuccess(isDraft ? 'Draft deleted' : 'Expense withdrawn');
      setWithdrawing(false);
      if (isDraft) router.push(MY_EXPENSES_PATH);
      else refetch();
    } catch (err) {
      setWithdrawError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const o = overview.data;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 pb-8">
      <Link href={MY_EXPENSES_PATH} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-fg-muted transition-colors hover:text-fg sm:text-sm">
        <ArrowLeft className="h-3.5 w-3.5" />
        My expenses
      </Link>
      {isLoading ? (
        <ClaimDetailSkeleton />
      ) : !detail ? (
        <Missing notFound={notFound} error={error} onRetry={refetch} />
      ) : (
        <>
          <ClaimHeader detail={detail} showEmployee={false}>
            {detail.can.edit && (
              <Btn variant="primary" icon={<Pencil className="h-3.5 w-3.5" />} disabled={!o} onClick={() => setEditing(true)}>
                Edit draft
              </Btn>
            )}
            {detail.can.cancel && (
              <Btn icon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => setWithdrawing(true)}>
                {isDraft ? 'Delete draft' : 'Withdraw'}
              </Btn>
            )}
            <ClaimExportButton scope="me" claimId={detail.id} number={detail.number} />
          </ClaimHeader>
          {detail.status === 'approved' && detail.channel === 'claim' && (
            <p className="px-1 text-xs text-fg-muted sm:text-sm">
              Approved.{' '}
              {waitsForPaperBill(detail.physicalCopy)
                ? 'Hand in the paper bill first: you are paid back once HR has it.'
                : detail.payoutMode === 'payroll'
                  ? 'It is paid with your next salary.'
                  : 'Accounts pays it back to you.'}
            </p>
          )}
          <Body detail={detail} scope="me" aside={detail.physicalCopy.status !== 'not_required' ? <PaperBillPanel detail={detail} scope="me" /> : undefined} />
          {o && isDraft && (
            <ExpenseFormDrawer
              mode="me"
              open={editing}
              onClose={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                refetch();
              }}
              categories={o.categories}
              channels={o.channels}
              wallet={o.wallet}
              today={o.today}
              receiptScan={o.policy.receiptScan}
              draft={detail}
            />
          )}
          <ConfirmDialog
            open={withdrawing}
            title={isDraft ? 'Delete this draft?' : 'Withdraw this expense?'}
            message={isDraft ? 'The draft and its receipts are removed.' : `${money(detail.amount)} is taken out of approval. You can file it again later.`}
            confirmLabel={isDraft ? 'Delete draft' : 'Withdraw'}
            danger
            busy={busy}
            error={withdrawError}
            onClose={() => setWithdrawing(false)}
            onConfirm={withdraw}
          />
        </>
      )}
    </div>
  );
}

// ── HR / Accounts ───────────────────────────────────────────────────────────

export function ClaimDetailPage({ claimId }: { claimId: number }) {
  const f = useExpenseFeatures();
  if (!f.any) return <FeatureOff what="Expenses" />;
  return <HrClaim claimId={claimId} />;
}

type Dialogs = 'pay' | 'payout' | 'cancel' | null;

function HrClaim({ claimId }: { claimId: number }) {
  const base = useExpensesBasePath();
  const { can, canAny } = usePermission();
  const { detail, isLoading, error, notFound, refetch } = useClaimDetail(claimId, 'hr');
  const [dialog, setDialog] = React.useState<Dialogs>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const done = React.useCallback(() => {
    setDialog(null);
    refetch();
  }, [refetch]);
  const actions = useClaimActions(claimId, done);
  const open = (d: Dialogs) => {
    actions.clearError();
    setDialog(d);
  };
  const canBrowse = canAny(CLAIMS_ACCESS);
  const canPdf = canAny(CLAIMS_EXPORT_ACCESS);
  const canUndoBill = can(REIMB_PERMISSIONS.PHYSICAL_COLLECT);
  const waitsForBill = detail ? waitsForPaperBill(detail.physicalCopy) : false;
  // Pay is hidden by the server while the bill is held; show it disabled with the reason instead.
  const payableByHand = Boolean(detail && detail.status === 'approved' && detail.channel === 'claim' && detail.payoutMode !== 'payroll' && can(REIMB_PERMISSIONS.DISBURSE));

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 pb-8">
      {canBrowse && (
        <Link href={`${base}/claims`} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-fg-muted transition-colors hover:text-fg sm:text-sm">
          <ArrowLeft className="h-3.5 w-3.5" />
          All expenses
        </Link>
      )}
      {isLoading ? (
        <ClaimDetailSkeleton />
      ) : !detail ? (
        <Missing notFound={notFound} error={error} onRetry={refetch} />
      ) : (
        <>
          <ClaimHeader detail={detail} showEmployee>
            {canPdf && (
              <ClaimExportButton scope="hr" claimId={detail.id} number={detail.number} />
            )}
            {detail.status === 'pending' && detail.approval?.status === 'pending' && (
              <Btn variant="primary" icon={<ClipboardCheck className="h-3.5 w-3.5" />} onClick={() => setReviewOpen(true)}>
                Review &amp; approve
              </Btn>
            )}
            {waitsForBill && (detail.can.pay || payableByHand) ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-fg-muted sm:text-sm">Payment waits for the paper bill</span>
                <Btn variant="primary" icon={<Banknote className="h-3.5 w-3.5" />} disabled title="Collect the paper bill before paying this claim">
                  Pay
                </Btn>
              </span>
            ) : (
              detail.can.pay && (
                <Btn variant="primary" icon={<Banknote className="h-3.5 w-3.5" />} onClick={() => open('pay')}>
                  Pay
                </Btn>
              )
            )}
            {detail.can.changePayout && (
              <Btn icon={<Repeat2 className="h-3.5 w-3.5" />} onClick={() => open('payout')}>
                {detail.payoutMode === 'payroll' ? 'Pay by Accounts' : 'Pay with payroll'}
              </Btn>
            )}
            {detail.can.cancel && (
              <Btn icon={<Ban className="h-3.5 w-3.5" />} onClick={() => open('cancel')}>
                Cancel
              </Btn>
            )}
          </ClaimHeader>
          {detail.status === 'approved' && detail.channel === 'claim' && detail.payoutMode === 'payroll' && (
            <p className="px-1 text-xs text-fg-muted sm:text-sm">
              {waitsForBill
                ? 'It goes to the employee’s next draft pay run once the paper bill is collected.'
                : detail.inPayroll
                  ? 'Added to the employee’s draft pay run. Finalising the run marks it paid.'
                  : 'It is added as a non-taxable earning to the employee’s next draft pay run.'}
            </p>
          )}
          <Body
            detail={detail}
            scope="hr"
            aside={detail.physicalCopy.status !== 'not_required' || detail.can.collect ? <PaperBillPanel detail={detail} scope="hr" canUndo={canUndoBill} onChanged={refetch} /> : undefined}
          />

          <PayDialog
            open={dialog === 'pay'}
            title="Pay this expense"
            summary={
              <>
                Record that <span className="font-semibold text-fg">{money(detail.amount)}</span> was paid back to <span className="font-semibold text-fg">{detail.employee.name}</span>.
              </>
            }
            busy={actions.busy}
            error={actions.error}
            onClose={() => setDialog(null)}
            onSubmit={actions.pay}
          />
          <PayoutModeDialog open={dialog === 'payout'} current={detail.payoutMode} busy={actions.busy} error={actions.error} onClose={() => setDialog(null)} onSubmit={actions.setPayout} />
          <CancelClaimDialog open={dialog === 'cancel'} amount={detail.amount} busy={actions.busy} error={actions.error} onClose={() => setDialog(null)} onSubmit={actions.cancel} />
          <RequestDrawer id={reviewOpen && detail.approval ? detail.approval.requestId : null} onClose={() => setReviewOpen(false)} onChanged={refetch} />
        </>
      )}
    </div>
  );
}
