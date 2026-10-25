'use client';

import React from 'react';
import { Check, Paperclip, ShieldCheck, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/reimbursement.api';
import { EVENT_LABEL, PAYMENT_MODE_LABEL, PAYOUT_MODE_LABEL } from '../../constants/reimbursement.constants';
import type { ApprovalSummary, ClaimDetail, ClaimEvent, ClaimLine } from '../../types/reimbursement.model';
import { withoutBillNotes } from '@/features/expense-bills/utils/bill';
import { dateText, dateTimeText, initials, money } from '../../utils/format';
import { Balance, ChannelBadge, ClaimStatusPill, FlagList } from './StatusBadges';
import { AiMarker } from '@/features/expense-bills/components/BillPanel';
import { claimLineFiles } from '../../utils/claimFiles';
import { ReceiptViewer, type ReceiptFact } from '@/features/expense-bills/components/ReceiptViewer';
import { Block, CategoryIcon, Fact } from './Primitives';

type FileTarget = 'proof';

function useFileOpener(scope: 'me' | 'hr', claimId: number) {
  const [opening, setOpening] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const open = async (file: FileTarget) => {
    const id = file;
    setOpening(id);
    setError('');
    const tab = window.open('', '_blank');
    try {
      const { url } = await api.claimFileUrl(scope, claimId, file);
      if (tab) tab.location.href = url;
      else window.open(url, '_blank', 'noopener');
    } catch (err) {
      tab?.close();
      setError(messageOf(err));
    } finally {
      setOpening(null);
    }
  };
  return { open, opening, error };
}

export function ClaimHeader({ detail, children, showEmployee }: { detail: ClaimDetail; children?: React.ReactNode; showEmployee: boolean }) {
  const d = detail;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {showEmployee && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fg text-sm font-bold text-[var(--tt-on-primary)]">{initials(d.employee.name)}</span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-bold text-fg sm:text-lg">{d.title}</h1>
            <ClaimStatusPill status={d.status} channel={d.channel} />
            <ChannelBadge channel={d.channel} />
          </div>
          <p className="truncate text-xs text-fg-muted sm:text-sm">
            {[d.number, showEmployee ? d.employee.name : null, showEmployee ? d.employee.code : null, d.company?.name].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function AmountStrip({ detail }: { detail: ClaimDetail }) {
  const d = detail;
  const decided = d.approvedAmount !== null;
  const cut = decided ? d.claimedAmount - (d.approvedAmount as number) : 0;
  const items: Array<{ label: string; value: React.ReactNode; note?: string }> = [
    { label: 'Claimed', value: money(d.claimedAmount), note: `${d.lineCount} ${d.lineCount === 1 ? 'expense' : 'expenses'}` },
    { label: 'Approved', value: decided ? money(d.approvedAmount) : '—', note: cut > 0 ? `${money(cut)} not approved` : decided ? 'In full' : 'Not decided yet' },
  ];
  if (d.channel === 'claim') items.push({ label: 'Paid back', value: d.status === 'paid' ? money(d.amount) : '—', note: d.status === 'paid' ? dateText(d.paidOn) : d.payoutMode ? PAYOUT_MODE_LABEL[d.payoutMode] : undefined });
  if (d.wallet) items.push({ label: 'Wallet balance', value: <Balance value={d.wallet.balance} />, note: `${money(d.wallet.available)} available` });
  return (
    <div className={cx('grid grid-cols-2 gap-3', items.length > 3 ? 'md:grid-cols-4' : 'md:grid-cols-3')}>
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

function LineRow({ line, scope, claimId }: { line: ClaimLine; scope: 'me' | 'hr'; claimId: number }) {
  const l = line;
  const reduced = l.approvedAmount !== null && l.approvedAmount < l.amount;
  // Bill-check notes are shown in the bill panel.
  const lineFlags = withoutBillNotes(l.flags);
  const bills = React.useMemo(() => claimLineFiles(l.attachments, { scope, claimId, lineId: l.id }), [scope, claimId, l.id, l.attachments]);
  const proofs = React.useMemo(() => claimLineFiles(l.paymentProofs, { scope, claimId, lineId: l.id, payment: true }), [scope, claimId, l.id, l.paymentProofs]);
  const paidBy = [l.paymentMode ? PAYMENT_MODE_LABEL[l.paymentMode] : null, l.paymentReference ? `Ref ${l.paymentReference}` : null].filter(Boolean).join(' · ');
  const facts: ReceiptFact[] = [
    { label: 'Claimed', value: money(l.amount) },
    { label: 'Approved', value: l.approvedAmount !== null ? money(l.approvedAmount) : '—' },
    { label: 'Date', value: dateText(l.expenseDate) },
    { label: 'Bill no.', value: l.invoiceNo || '—' },
  ];
  if (paidBy) facts.push({ label: 'Paid by', value: paidBy });
  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4 sm:px-5">
      <CategoryIcon icon={l.category.icon} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-fg">
            {l.category.name}
            {l.merchant && <span className="font-normal text-fg-muted"> · {l.merchant}</span>}
          </p>
          <p className="text-sm font-bold tabular-nums text-fg">
            {reduced ? (
              <>
                <span className="mr-1.5 font-normal text-fg-subtle line-through">{money(l.amount)}</span>
                {money(l.approvedAmount)}
              </>
            ) : (
              money(l.amount)
            )}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-fg-muted">
          {dateText(l.expenseDate)}
          {l.category.kind === 'distance' && l.quantity !== null ? ` · ${l.quantity} km${l.rate ? ` × ${money(l.rate)}` : ''}` : ''}
          {l.invoiceNo ? ` · Bill ${l.invoiceNo}` : ''}
        </p>
        {l.aiScanned && <AiMarker label="Filled by AI from the receipt" className="mt-1.5" />}
        {l.description && <p className="mt-1 text-xs text-fg sm:text-sm">{l.description}</p>}
        {lineFlags.length > 0 && (
          <div className="mt-2">
            <FlagList flags={lineFlags} compact />
          </div>
        )}
        {(bills.length > 0 || proofs.length > 0 || l.bill) && (
          <div className="mt-2">
            <ReceiptViewer
              bills={bills}
              proofs={proofs}
              title={[l.category.name, l.merchant].filter(Boolean).join(' · ')}
              subtitle={[dateText(l.expenseDate), l.invoiceNo ? `Bill ${l.invoiceNo}` : null, money(l.amount)].filter(Boolean).join(' · ')}
              bill={l.bill}
              fromAi={l.aiScanned}
              flags={lineFlags}
              facts={facts}
            />
          </div>
        )}
        {(l.paymentMode || l.paymentReference || l.paymentProofs.length > 0) && (
          <p className="mt-2 text-xs">
            <span className="text-fg-muted">Paid by </span>
            <span className="font-semibold text-fg">{paidBy || '—'}</span>
            {l.paymentProofs.length > 0 && <span className="text-fg-muted"> · {l.paymentProofs.length} payment {l.paymentProofs.length === 1 ? 'proof' : 'proofs'}</span>}
          </p>
        )}
      </div>
    </li>
  );
}

export function ClaimLines({ detail, scope }: { detail: ClaimDetail; scope: 'me' | 'hr' }) {
  return (
    <div>
      {detail.flags.length > 0 && (
        <div className="border-b border-line bg-bg-subtle/60 px-4 py-3 sm:px-5">
          <FlagList flags={detail.flags} />
        </div>
      )}
      <ul className="divide-y divide-line">
        {detail.lines.map((l) => (
          <LineRow key={l.id} line={l} scope={scope} claimId={detail.id} />
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
        <span className="text-xs font-semibold text-fg-muted">Total</span>
        <span className="text-base font-extrabold tabular-nums text-fg">{money(detail.amount)}</span>
      </div>
    </div>
  );
}

export function PaymentProof({ detail, scope }: { detail: ClaimDetail; scope: 'me' | 'hr' }) {
  const opener = useFileOpener(scope, detail.id);
  if (detail.status !== 'paid') return null;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => detail.hasProof && opener.open('proof')}
        disabled={!detail.hasProof || opener.opening === 'proof'}
        className="flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left transition-colors enabled:hover:bg-bg-subtle disabled:cursor-default"
      >
        <ShieldCheck className="h-4 w-4 shrink-0 text-fg-muted" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{detail.inPayroll ? 'Paid with payroll' : 'Payment'}</span>
          <span className="block truncate text-[11px] text-fg-muted">
            {[detail.paidReference ? `Reference ${detail.paidReference}` : null, dateText(detail.paidOn)].filter(Boolean).join(' · ')}
          </span>
        </span>
        {detail.hasProof && (opener.opening === 'proof' ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-fg border-t-transparent" /> : <Paperclip className="h-3.5 w-3.5 text-fg-subtle" />)}
      </button>
      {opener.error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{opener.error}</p>}
    </div>
  );
}

export function ClaimFacts({ detail }: { detail: ClaimDetail }) {
  const d = detail;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Fact label="Paid with" value={d.channel === 'wallet' ? 'Expense wallet' : 'Own money'} />
      {d.channel === 'claim' && <Fact label="Paid back" value={d.payoutMode ? PAYOUT_MODE_LABEL[d.payoutMode] : '—'} />}
      <Fact label="Submitted" value={dateText(d.submittedAt || d.createdAt)} />
      <Fact label="Decided" value={dateText(d.decidedAt)} />
      {d.employee.department && <Fact label="Department" value={d.employee.department} />}
      {d.source && d.source !== 'employee' && <Fact label="Filed by" value={d.source === 'hr' ? 'HR' : 'Imported'} />}
      {d.purpose && <Fact wide label="Purpose" value={<span className="font-normal">{d.purpose}</span>} />}
      {d.decisionNote && <Fact wide label="Decision note" value={<span className="font-normal">{d.decisionNote}</span>} />}
    </dl>
  );
}

const STEP_DOT: Record<string, string> = {
  approved: 'bg-fg text-[var(--tt-on-primary)]',
  rejected: 'bg-[var(--tt-danger)] text-white',
  current: 'border-2 border-fg bg-surface text-fg',
  skipped: 'border border-line bg-bg-subtle text-fg-subtle',
  waiting: 'border border-line-strong bg-surface text-fg-subtle',
};

const STEP_LABEL: Record<string, string> = { approved: 'Approved', rejected: 'Rejected', current: 'Waiting now', skipped: 'Not needed', waiting: 'Next' };

export function ApprovalSteps({ approval }: { approval: ApprovalSummary }) {
  if (!approval.steps.length) return <p className="text-sm text-fg-muted">Approval request #{approval.requestId} · {approval.status.replace(/_/g, ' ')}</p>;
  return (
    <ol className="flex flex-col gap-3">
      {approval.steps.map((s) => (
        <li key={s.index} className="flex gap-3">
          <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', STEP_DOT[s.state] || STEP_DOT.waiting)}>
            {s.state === 'approved' ? <Check className="h-3.5 w-3.5" /> : s.state === 'rejected' ? <X className="h-3.5 w-3.5" /> : s.index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">
              {s.name} <span className="font-normal text-fg-muted">· {STEP_LABEL[s.state] || s.state}</span>
            </p>
            {s.approvers.map((a, i) => (
              <div key={`${a.name}-${i}`} className="mt-0.5 text-xs text-fg-muted">
                {a.name}
                {a.actedAt ? ` · ${a.status.replace(/_/g, ' ')} ${dateTimeText(a.actedAt)}` : ''}
                {a.note && <p className="mt-1 rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg">{a.note}</p>}
              </div>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

function eventDetail(e: ClaimEvent): string | null {
  const d = e.data;
  const parts: string[] = [];
  if (typeof d.amount === 'number') parts.push(money(d.amount));
  if (typeof d.approved_amount === 'number') parts.push(`${money(d.approved_amount)} approved`);
  if (typeof d.channel === 'string') parts.push(d.channel === 'wallet' ? 'from the wallet' : 'as a claim');
  if (typeof d.reference === 'string' && d.reference) parts.push(`Ref ${d.reference}`);
  if (typeof d.via === 'string' && d.via === 'payroll') parts.push('with payroll');
  if (typeof d.to === 'string' && e.action === 'payout_changed') parts.push(`now ${PAYOUT_MODE_LABEL[d.to as 'manual' | 'payroll'] ?? d.to}`);
  if (Array.isArray(d.lines)) parts.push(`${d.lines.length} ${d.lines.length === 1 ? 'line' : 'lines'} changed`);
  return parts.length ? parts.join(' · ') : null;
}

const STRONG = new Set(['approved', 'paid', 'submitted']);
const MUTED = new Set(['cancelled', 'withdrawn', 'rejected', 'drafted']);

export function ClaimHistory({ events }: { events: ClaimEvent[] }) {
  const sorted = [...events].sort((a, b) => ((a.at || '') < (b.at || '') ? 1 : -1));
  if (!sorted.length) return <p className="text-sm text-fg-muted">Nothing recorded yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {sorted.map((e) => {
        const detailText = eventDetail(e);
        const note = typeof e.data.note === 'string' ? e.data.note : typeof e.data.reason === 'string' ? e.data.reason : null;
        return (
          <li key={e.id} className="relative">
            <span
              aria-hidden
              className={cx(
                'absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-surface',
                STRONG.has(e.action) ? 'bg-fg' : MUTED.has(e.action) ? 'bg-fg-subtle' : 'border border-fg bg-surface'
              )}
            />
            <p className="text-sm font-semibold text-fg">
              {EVENT_LABEL[e.action] || e.action.replace(/_/g, ' ')}
              {e.by && <span className="font-normal text-fg-muted"> by {e.by}</span>}
            </p>
            <p className="text-xs text-fg-muted">
              {dateTimeText(e.at)}
              {detailText ? ` · ${detailText}` : ''}
            </p>
            {note && <p className="mt-1 rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg">{note}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function ClaimDetailSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Block className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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
