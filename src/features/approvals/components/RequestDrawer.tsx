'use client';

import React from 'react';
import { Check, CornerUpLeft, Send, Undo2, UserRoundCog, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Drawer } from '@/components/ui/Drawer';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { ApiError, messageOf, statusOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/approvals.api';
import { STATUS_LABEL } from '../constants';
import type { EmployeeRef, RequestDetail } from '../types/approvals';
import { ApprovalTimeline } from './ApprovalTimeline';
import { PunchEvidenceList } from './PunchEvidenceList';
import { EmployeeSearch } from './EmployeeSearch';
import { ApprovalPlanSection } from '@/features/salary-advance/components/ApprovalPlanSection';
import type { PlanRequestDto } from '@/features/salary-advance/types/salaryAdvance.dto';
import { ExpenseClaimReviewSection, type ClaimReviewValue } from '@/features/reimbursement/components/ExpenseClaimReviewSection';
import { WalletFundAmountSection } from '@/features/reimbursement/components/WalletFundAmountSection';
import { PettyExpenseReviewSection, type PettyApproveExtra } from '@/features/petty-cash/components/PettyExpenseReviewSection';
import { PettyFundAmountSection } from '@/features/petty-cash/components/PettyFundAmountSection';
import { RegularizationTimesSection, RegularizationTimesTable, RegularizationTrail, TIME_LINE_KEYS } from '@/features/attendance-approvals/components/RegularizationTimes';

type Action = 'approve' | 'reject' | 'send_back' | 'reassign';

/** One labelled fact; long values (a reason, a place) take the full row so they never squeeze. */
function Fact({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cx('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

export function RequestDrawer({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged: () => void }) {
  const [request, setRequest] = React.useState<RequestDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [action, setAction] = React.useState<Action | null>(null);
  const [note, setNote] = React.useState('');
  const [noteError, setNoteError] = React.useState('');
  const [target, setTarget] = React.useState<EmployeeRef[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [plan, setPlan] = React.useState<{ value: PlanRequestDto | null; valid: boolean }>({ value: null, valid: true });
  const onPlan = React.useCallback((value: PlanRequestDto | null, valid: boolean) => setPlan({ value, valid }), []);
  // Type-specific approval input other than the salary-advance plan (expense line amounts, wallet fund amount).
  const [formExtra, setFormExtra] = React.useState<{ value: Record<string, unknown> | null; valid: boolean }>({ value: null, valid: true });
  const onClaimReview = React.useCallback((value: ClaimReviewValue | null, valid: boolean) => setFormExtra({ value: value ? { lines: value.lines } : null, valid }), []);
  const onFundAmount = React.useCallback((amount: number | null, valid: boolean) => setFormExtra({ value: amount !== null ? { approved_amount: amount } : null, valid }), []);
  const onPettyReview = React.useCallback((value: PettyApproveExtra | null, valid: boolean) => setFormExtra({ value, valid }), []);
  // The approve call said the paper bill / the goods must be received first (petty cash).
  const [paperBlocked, setPaperBlocked] = React.useState(false);
  const [goodsBlocked, setGoodsBlocked] = React.useState(false);
  // The server refused the received quantities (petty cash 400 `items`): shown on the quantities.
  const [itemsError, setItemsError] = React.useState('');
  // The server refused the approved amount (petty cash): shown on the amount box.
  const [amountError, setAmountError] = React.useState('');
  React.useEffect(() => { setAmountError(''); setItemsError(''); }, [action]);
  const onTimes = React.useCallback((value: { in_time?: string; out_time?: string } | null, valid: boolean) => setFormExtra({ value, valid }), []);

  const load = React.useCallback(async () => {
    if (!id) return;
    try { setRequest(await api.getRequest(id)); setError(null); } catch (e) { setError(messageOf(e)); }
  }, [id]);

  React.useEffect(() => { setRequest(null); setAction(null); setPlan({ value: null, valid: true }); setFormExtra({ value: null, valid: true }); setPaperBlocked(false); setGoodsBlocked(false); setAmountError(''); setItemsError(''); load(); }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); showSuccess(ok); setAction(null); setNote(''); setTarget([]); await load(); onChanged(); } catch (e) {
      const data = e instanceof ApiError ? (e.data as { reason?: string; errors?: Record<string, unknown> } | null) : null;
      const amountMsg = typeof data?.errors?.approved_amount === 'string' ? data.errors.approved_amount : '';
      const itemsMsg = typeof data?.errors?.items === 'string' ? data.errors.items : '';
      if (action === 'approve' && statusOf(e) === 409 && data?.reason === 'physical_copy_pending') setPaperBlocked(true);
      else if (action === 'approve' && statusOf(e) === 409 && data?.reason === 'inward_pending') setGoodsBlocked(true);
      else if (action === 'approve' && statusOf(e) === 400 && itemsMsg) setItemsError(itemsMsg);
      else if (action === 'approve' && statusOf(e) === 400 && amountMsg) setAmountError(amountMsg);
      else showError(messageOf(e));
    } finally { setBusy(false); }
  };

  const confirm = () => {
    if (!request || !action) return;
    if ((action === 'reject' || action === 'send_back') && !note.trim()) { setNoteError(action === 'reject' ? 'Add a reason for rejecting' : 'Say what needs to change'); return; }
    if (action === 'reassign') {
      if (!target[0]) return;
      return run(() => api.reassign(request.id, target[0].id), 'Reassigned');
    }
    if (action === 'send_back') return run(() => api.sendBack(request.id, note.trim()), 'Sent back');
    if (action === 'approve' && (!plan.valid || !formExtra.valid)) return;
    const merged = action === 'approve' ? { ...(plan.value ? { plan: plan.value } : {}), ...(formExtra.value ?? {}) } : {};
    const extra = Object.keys(merged).length ? merged : undefined;
    return run(() => api.decide(request.id, action, note.trim() || undefined, extra), action === 'approve' ? 'Approved' : 'Rejected');
  };

  const a = request?.actions;
  const form = request?.detail?.decision_form;
  const planAdvanceId = form?.kind === 'salary_advance_plan' && form.advance_id ? form.advance_id : null;
  const reviewClaimId = form?.kind === 'expense_claim_review' && form.claim_id ? form.claim_id : null;
  const fundAmount = form?.kind === 'wallet_fund_amount' && Number(form.amount) > 0 ? Number(form.amount) : null;
  const pettyExpenseId = form?.kind === 'petty_cash_expense_review' && form.expense_id ? form.expense_id : null;
  const pettyFundAmount = form?.kind === 'petty_cash_fund_amount' && Number(form.amount) > 0 ? Number(form.amount) : null;
  const times = request?.detail?.times ?? null;
  const correctTimes = form?.kind === 'regularization_times' && times ? times : null;
  const wideForm = Boolean(planAdvanceId || reviewClaimId || pettyExpenseId);
  const formValid = plan.valid && formExtra.valid;
  const titles: Record<Action, string> = { approve: 'Approve request', reject: 'Reject request', send_back: 'Send back for changes', reassign: 'Reassign to another approver' };

  return (
    <Drawer open={Boolean(id)} onClose={onClose} title={request?.detail?.title || request?.typeLabel || 'Request'} maxWidthClassName="sm:max-w-2xl xl:max-w-5xl"
      footer={a && (a.decide || a.sendBack || a.withdraw || a.resubmit || a.override || a.reassign) ? (
        <div className="flex flex-wrap gap-2">
          {(a.decide || a.override) && <Btn variant="primary" icon={<Check className="h-4 w-4" />} onClick={() => setAction('approve')}>{a.override ? 'Approve as admin' : 'Approve'}</Btn>}
          {(a.decide || a.override) && <Btn variant="danger" icon={<X className="h-4 w-4" />} onClick={() => setAction('reject')}>Reject</Btn>}
          {a.sendBack && <Btn icon={<CornerUpLeft className="h-4 w-4" />} onClick={() => setAction('send_back')}>Send back</Btn>}
          {a.reassign && <Btn icon={<UserRoundCog className="h-4 w-4" />} onClick={() => setAction('reassign')}>Reassign</Btn>}
          {a.resubmit && <Btn variant="primary" icon={<Send className="h-4 w-4" />} busy={busy} onClick={() => request && run(() => api.resubmit(request.id), 'Resubmitted')}>Resubmit</Btn>}
          {a.withdraw && <Btn icon={<Undo2 className="h-4 w-4" />} busy={busy} onClick={() => request && run(() => api.withdraw(request.id), 'Withdrawn')}>Withdraw</Btn>}
        </div>
      ) : undefined}>
      {error && <Alert message={error} />}
      {!request && !error && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]" aria-busy="true">
          <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-subtle" />)}</div>
          <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />
        </div>
      )}
      {request && (
        // Wide enough to read a request at a glance: facts in two columns, the timeline beside them on large screens.
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-4">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Fact label="Type" value={request.typeLabel} />
              <Fact label="Requested by" value={request.requester?.name || '—'} />
              <Fact label="Status" value={STATUS_LABEL[request.status]} />
              {request.detail?.lines.filter((l) => !(times && l.key && TIME_LINE_KEYS.has(l.key))).map((l, i) => (
                <Fact key={`${i}-${l.label}`} label={l.label} wide={l.value.length > 48}
                  value={/^https?:\/\//.test(l.value) ? <a href={l.value} target="_blank" rel="noopener noreferrer" className="text-[var(--tt-primary)] underline-offset-2 hover:underline">View file</a> : l.value} />
              ))}
            </dl>
            {times && <RegularizationTimesTable times={times} />}
            {request.detail?.punches && request.detail.punches.length > 0 && <PunchEvidenceList requestId={request.id} punches={request.detail.punches} />}
            {request.detail?.trail && <RegularizationTrail steps={request.detail.trail} />}
            {request.detail?.impact && (
              <div className="rounded-lg border border-line bg-bg-subtle p-3">
                <p className="text-xs font-semibold text-fg">{request.detail.impact.label}</p>
                <p className="mt-1 text-sm text-fg-muted">{(request.detail.impact.items ?? []).join(', ')}</p>
              </div>
            )}
          </div>
          <div className="min-w-0 xl:border-l xl:border-line xl:pl-5">
            <ApprovalTimeline request={request} />
          </div>
          {pettyExpenseId && (
            <section aria-label="Bill and receipt" className="min-w-0 border-t border-line pt-4 xl:col-span-2">
              <PettyExpenseReviewSection expenseId={pettyExpenseId} amount={Number(form?.amount) || 0} physical={form?.physical} readOnly />
            </section>
          )}
          {reviewClaimId && (
            // Each bill's receipt beside its items, so amounts can be compared before deciding.
            <section aria-label="Bills and receipts" className="min-w-0 border-t border-line pt-4 xl:col-span-2">
              <ExpenseClaimReviewSection claimId={reviewClaimId} readOnly />
            </section>
          )}
        </div>
      )}
      <Dialog open={Boolean(action)} onClose={() => setAction(null)} title={action ? titles[action] : ''} maxWidthClassName={action === 'approve' && (reviewClaimId || pettyExpenseId) ? 'max-w-4xl' : action === 'approve' && wideForm ? 'max-w-xl' : undefined}
        footer={<div className="flex justify-end gap-2"><Btn onClick={() => setAction(null)}>Cancel</Btn><Btn variant={action === 'reject' ? 'danger' : 'primary'} busy={busy} disabled={action === 'approve' && !formValid} onClick={confirm}>Confirm</Btn></div>}>
        {action === 'approve' && planAdvanceId && (
          <div className="mb-4 border-b border-line pb-4">
            <ApprovalPlanSection advanceId={planAdvanceId} onChange={onPlan} />
          </div>
        )}
        {action === 'approve' && reviewClaimId && (
          <div className="mb-4 border-b border-line pb-4">
            <ExpenseClaimReviewSection claimId={reviewClaimId} onChange={onClaimReview} />
          </div>
        )}
        {action === 'approve' && pettyExpenseId && (
          <div className="mb-4 border-b border-line pb-4">
            <PettyExpenseReviewSection
              expenseId={pettyExpenseId}
              amount={Number(form?.amount) || 0}
              physical={form?.physical}
              inward={form?.inward}
              blockedPaper={paperBlocked}
              blockedGoods={goodsBlocked}
              onChange={onPettyReview}
              itemsError={itemsError}
              onItemsEdit={() => setItemsError('')}
              serverError={amountError}
              onEdit={() => setAmountError('')}
            />
          </div>
        )}
        {action === 'approve' && pettyFundAmount !== null && (
          <div className="mb-4 border-b border-line pb-4">
            <PettyFundAmountSection requested={pettyFundAmount} fundRequestId={form?.fund_request_id ?? null} onChange={onFundAmount} serverError={amountError} onEdit={() => setAmountError('')} />
          </div>
        )}
        {action === 'approve' && correctTimes && (
          <div className="mb-4 border-b border-line pb-4">
            <RegularizationTimesSection times={correctTimes} onChange={onTimes} />
          </div>
        )}
        {action === 'approve' && fundAmount !== null && (
          <div className="mb-4 border-b border-line pb-4">
            <WalletFundAmountSection requested={fundAmount} onChange={onFundAmount} fundRequestId={form?.fund_request_id ?? null} files={form?.files ?? []} />
          </div>
        )}
        {action === 'reassign' ? (
          <EmployeeSearch label="New approver" value={target} onChange={(v) => setTarget(v.slice(-1))} excludeIds={request?.requester ? [request.requester.id] : []} />
        ) : (
          <Textarea label={action === 'approve' ? 'Note' : action === 'reject' ? 'Reason' : 'What needs to change'} required={action !== 'approve'} value={note} error={noteError}
            onChange={(e) => { setNote(e.target.value); setNoteError(''); }} />
        )}
      </Dialog>
    </Drawer>
  );
}
