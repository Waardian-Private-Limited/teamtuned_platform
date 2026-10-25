'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, ClipboardCheck, Undo2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { AiMarker } from '@/features/expense-bills/components/BillPanel';
import { FlagList } from '@/features/expense-bills/components/Flags';
import { ReceiptViewer, type ReceiptFact } from '@/features/expense-bills/components/ReceiptViewer';
import { PAYMENT_MODE_LABEL } from '@/features/expense-bills/constants/bill.constants';
import { withoutBillNotes } from '@/features/expense-bills/utils/bill';
import { RequestDrawer } from '@/features/approvals/components/RequestDrawer';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { ConfirmDialog } from '@/features/reimbursement/components/components/ClaimDialogs';
import { useMutation } from '@/features/reimbursement/hooks/useClaimActions';
import * as api from '../api/petty-cash.api';
import { EXPENSES_ACCESS, ILLUSTRATIONS } from '../constants/petty-cash.constants';
import { useExpenseDetail } from '../hooks/useExpenseDetail';
import { MY_PETTY_CASH_PATH, usePettyCashBasePath } from '../hooks/usePettyCashBasePath';
import { usePettyCashAccess } from '../hooks/usePettyCashAccess';
import type { ExpenseDetail } from '../types/petty-cash.model';
import { dateText, dateTimeText, initials, money } from '../utils/format';
import { expenseFiles } from '../utils/pettyFiles';
import { ApprovalSteps, ExpenseHistory } from './components/ApprovalSteps';
import { CancelExpenseDialog } from './components/ExpenseDialogs';
import { GoodsInwardBlock, PaperBillBlock } from './components/InwardBlock';
import { Block, FeatureOff, NoAccess, Panel } from './components/Primitives';
import { ExpenseStatusPill, PhysicalCopyPill } from './components/StatusBadges';

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Block className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Block key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Block className="h-80 rounded-xl" />
        <Block className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

function Missing({ notFound, error, onRetry }: { notFound: boolean; error: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <EmptyState
        illustration={ILLUSTRATIONS.notFound}
        title={notFound ? 'Expense not found' : 'Could not load this expense'}
        description={notFound ? 'It may have been deleted, or it belongs to a company you cannot see.' : error}
        action={notFound ? undefined : { label: 'Try again', onClick: onRetry, variant: 'link' }}
      />
    </div>
  );
}

function Header({ detail, showSpender, children }: { detail: ExpenseDetail; showSpender: boolean; children?: React.ReactNode }) {
  const d = detail;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {showSpender && <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fg text-sm font-bold text-[var(--tt-on-primary)]">{initials(d.spender.name)}</span>}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-bold text-fg sm:text-lg">{d.merchant || d.description || d.category.name}</h1>
            <ExpenseStatusPill status={d.status} />
          </div>
          <p className="truncate text-xs text-fg-muted sm:text-sm">{[d.number, showSpender ? d.spender.name : null, showSpender ? d.spender.code : null, d.wallet.name, d.company?.name].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

function AmountStrip({ detail }: { detail: ExpenseDetail }) {
  const d = detail;
  const decided = d.approvedAmount !== null;
  const cut = decided ? d.amount - (d.approvedAmount as number) : 0;
  const items: Array<{ label: string; value: React.ReactNode; note?: string }> = [
    { label: 'Amount', value: money(d.amount), note: dateText(d.expenseDate) },
    { label: 'Approved', value: decided ? money(d.approvedAmount) : '—', note: cut > 0 ? `${money(cut)} not approved` : decided ? 'In full' : d.status === 'pending' ? 'Held in the wallet' : 'Not approved' },
    { label: 'Paid by', value: d.paymentMode ? PAYMENT_MODE_LABEL[d.paymentMode] : '—', note: d.paymentReference ? `Ref ${d.paymentReference}` : undefined },
    { label: 'Paper bill', value: <PhysicalCopyPill copy={d.physicalCopy} /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)]">
          <p className="text-xs font-semibold text-fg-muted">{it.label}</p>
          <p className="mt-1.5 truncate text-xl font-extrabold tabular-nums text-fg">{it.value}</p>
          {it.note && <p className="mt-1 truncate text-[11px] text-fg-muted sm:text-xs">{it.note}</p>}
        </div>
      ))}
    </div>
  );
}

function BillPanel({ detail, scope }: { detail: ExpenseDetail; scope: 'me' | 'hr' }) {
  const d = detail;
  const bills = React.useMemo(() => expenseFiles(scope, d.id, 'receipt', d.receipts), [scope, d.id, d.receipts]);
  const proofs = React.useMemo(() => expenseFiles(scope, d.id, 'payment', d.paymentProofs), [scope, d.id, d.paymentProofs]);
  const flags = withoutBillNotes(d.flags);
  const facts: ReceiptFact[] = [
    { label: 'Amount', value: money(d.amount) },
    { label: 'Approved', value: d.approvedAmount !== null ? money(d.approvedAmount) : '—' },
    { label: 'Date', value: dateText(d.expenseDate) },
    { label: 'Bill no.', value: d.invoiceNo || '—' },
  ];
  const empty = !d.bill && bills.length === 0 && proofs.length === 0;
  return (
    <Panel title="Bill" aside={d.aiScanned ? <AiMarker label="Filled by AI from the bill" /> : undefined}>
      {empty ? (
        <p className="text-sm text-fg-muted">No bill copy was attached.</p>
      ) : (
        <ReceiptViewer bills={bills} proofs={proofs} title={[d.category.name, d.merchant].filter(Boolean).join(' · ')} subtitle={[dateText(d.expenseDate), d.invoiceNo ? `Bill ${d.invoiceNo}` : null].filter(Boolean).join(' · ')} bill={d.bill} fromAi={d.aiScanned} flags={flags} facts={facts} />
      )}
      {flags.length > 0 && empty && <FlagList flags={flags} />}
    </Panel>
  );
}

function Facts({ detail }: { detail: ExpenseDetail }) {
  const d = detail;
  const rows: Array<[string, string | null]> = [
    ['Category', d.category.name],
    ['Wallet', d.wallet.name],
    ['Site', d.site?.name ?? null],
    ['Company', d.company?.name ?? null],
    ['Seller GSTIN', d.sellerGstin],
    ['Description', d.description],
    ['Purpose', d.purpose],
    ['Submitted', d.submittedAt ? dateTimeText(d.submittedAt) : null],
    ['Decided', d.decidedAt ? dateTimeText(d.decidedAt) : null],
    ['Decision note', d.decisionNote],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className={k === 'Description' || k === 'Purpose' || k === 'Decision note' ? 'col-span-2 min-w-0' : 'min-w-0'}>
            <dt className="text-[11px] text-fg-muted sm:text-xs">{k}</dt>
            <dd className="mt-0.5 break-words text-sm font-semibold text-fg">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function Body({ detail, scope, aside, onChanged }: { detail: ExpenseDetail; scope: 'me' | 'hr'; aside?: React.ReactNode; onChanged: () => void }) {
  return (
    <>
      <AmountStrip detail={detail} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <BillPanel detail={detail} scope={scope} />
          <Panel title="History">
            <ExpenseHistory events={detail.history} />
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {aside}
          {detail.inward.status !== 'not_required' && <GoodsInwardBlock detail={detail} scope={scope} onChanged={onChanged} />}
          {detail.physicalCopy.status !== 'not_required' && <PaperBillBlock detail={detail} scope={scope} onChanged={onChanged} />}
          {detail.approval && (
            <Panel title="Approval">
              <ApprovalSteps approval={detail.approval} />
            </Panel>
          )}
          <Panel title="Details">
            <Facts detail={detail} />
          </Panel>
        </div>
      </div>
    </>
  );
}

export function ExpenseDetailPage({ id, scope }: { id: number; scope: 'hr' | 'me' }) {
  const { enabled } = usePettyCashAccess();
  if (!enabled) return <FeatureOff what="Petty cash" />;
  return scope === 'me' ? <MyExpense id={id} /> : <HrExpense id={id} />;
}

// ── Employee ────────────────────────────────────────────────────────────────

function MyExpense({ id }: { id: number }) {
  const { detail, isLoading, error, notFound, forbidden, refetch } = useExpenseDetail(id, 'me');
  const [withdrawing, setWithdrawing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [withdrawError, setWithdrawError] = React.useState('');

  const withdraw = async () => {
    setBusy(true);
    setWithdrawError('');
    try {
      await api.cancelMyExpense(id);
      showSuccess('Expense withdrawn');
      setWithdrawing(false);
      refetch();
    } catch (err) {
      setWithdrawError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 pb-8">
      <Link href={`${MY_PETTY_CASH_PATH}?tab=expenses`} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-fg-muted transition-colors hover:text-fg sm:text-sm">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        My expenses
      </Link>
      {isLoading ? (
        <Skeleton />
      ) : forbidden ? (
        <NoAccess what="this expense" />
      ) : !detail ? (
        <Missing notFound={notFound} error={error} onRetry={refetch} />
      ) : (
        <>
          <Header detail={detail} showSpender={false}>
            {detail.can.cancel && (
              <Btn icon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => setWithdrawing(true)}>
                Withdraw
              </Btn>
            )}
          </Header>
          {detail.status === 'pending' && detail.physicalCopy.status === 'pending' && <p className="px-1 text-xs text-fg-muted sm:text-sm">Hand in the paper bill. It may be needed before this can be approved.</p>}
          <Body detail={detail} scope="me" onChanged={refetch} />
          <ConfirmDialog
            open={withdrawing}
            title="Withdraw this expense?"
            message={`${money(detail.amount)} is released back to the wallet and taken out of approval.`}
            confirmLabel="Withdraw"
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

// ── HR / staff ──────────────────────────────────────────────────────────────

function HrExpense({ id }: { id: number }) {
  const base = usePettyCashBasePath();
  const { canAny } = usePettyCashAccess();
  const { detail, isLoading, error, notFound, forbidden, refetch } = useExpenseDetail(id, 'hr');
  const [cancelling, setCancelling] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const done = React.useCallback(() => {
    setCancelling(false);
    refetch();
  }, [refetch]);
  const m = useMutation(done);
  const canBrowse = canAny(EXPENSES_ACCESS);

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 pb-8">
      {canBrowse && (
        <Link href={`${base}/expenses`} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-fg-muted transition-colors hover:text-fg sm:text-sm">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          All expenses
        </Link>
      )}
      {isLoading ? (
        <Skeleton />
      ) : forbidden ? (
        <NoAccess what="this expense" />
      ) : !detail ? (
        <Missing notFound={notFound} error={error} onRetry={refetch} />
      ) : (
        <>
          <Header detail={detail} showSpender>
            {detail.status === 'pending' && detail.can.approve && detail.approval?.status === 'pending' && (
              <Btn variant="primary" icon={<ClipboardCheck className="h-3.5 w-3.5" />} onClick={() => setReviewOpen(true)}>
                Review &amp; approve
              </Btn>
            )}
            {detail.can.cancel && (
              <Btn
                icon={<Ban className="h-3.5 w-3.5" />}
                onClick={() => {
                  m.clearError();
                  setCancelling(true);
                }}
              >
                Cancel
              </Btn>
            )}
          </Header>
          <Body detail={detail} scope="hr" onChanged={refetch} />
          <CancelExpenseDialog open={cancelling} amount={detail.status === 'approved' ? detail.netAmount : detail.amount} approved={detail.status === 'approved'} busy={m.busy} error={m.error} onClose={() => setCancelling(false)} onSubmit={(reason) => m.run(() => api.cancelExpense(id, reason), 'Expense cancelled')} />
          <RequestDrawer id={reviewOpen && detail.approval ? detail.approval.requestId : null} onClose={() => setReviewOpen(false)} onChanged={refetch} />
        </>
      )}
    </div>
  );
}

