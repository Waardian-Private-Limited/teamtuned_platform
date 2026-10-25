'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { shellClass } from '@/components/ui/FormControls';
import { formatDate } from '@/lib/datetime';
import { messageOf, statusOf } from '@/lib/api/errors';
import { money } from '@/features/salary-slips/utils/format';
import * as api from '../api/reimbursement.api';
import { PAYMENT_MODE_LABEL, categoryIcon } from '../constants/reimbursement.constants';
import { toBillModel, toFlag, toPaymentMode } from '../types/reimbursement.mapper';
import { withoutBillNotes } from '@/features/expense-bills/utils/bill';
import type { ClaimDetailDto, LineDto } from '../types/reimbursement.dto';
import { AiMarker } from '@/features/expense-bills/components/BillPanel';
import { claimLineFiles } from '../utils/claimFiles';
import { ReceiptViewer, type ReceiptFact } from '@/features/expense-bills/components/ReceiptViewer';

export interface ClaimReviewValue {
  lines: Array<{ id: number; approved_amount: number }>;
}

function cleanAmount(raw: string) {
  return raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

function lineError(raw: string, claimed: number): string {
  if (raw.trim() === '') return 'Enter the amount to approve';
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) return 'Enter a valid amount';
  if (v > claimed) return `Cannot be more than the ${money(claimed)} claimed`;
  return '';
}

interface ExpenseClaimReviewSectionProps {
  claimId: number;
  onChange?: (value: ClaimReviewValue | null, valid: boolean) => void;
  /** Only the bills beside their receipts (the approval drawer), no amounts to edit. */
  readOnly?: boolean;
}

/**
 * Shown when approving an expense claim: each bill's receipt beside its items (compare layout on wide
 * screens), and the approver may approve less than claimed on each line. Only changed lines are sent
 * back as `extra.lines`. `readOnly`: the same bills without the amount fields.
 */
export function ExpenseClaimReviewSection({ claimId, onChange, readOnly }: ExpenseClaimReviewSectionProps) {
  const [claim, setClaim] = React.useState<ClaimDetailDto | null>(null);
  const [error, setError] = React.useState('');
  const [forbidden, setForbidden] = React.useState(false);
  const [values, setValues] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    setClaim(null);
    setError('');
    setForbidden(false);
    api
      .getClaim(claimId)
      .then((dto) => {
        if (cancelled) return;
        setClaim(dto);
        setValues(Object.fromEntries((dto.lines || []).map((l) => [l.id, String(l.approved_amount ?? l.amount)])));
      })
      .catch((err) => {
        if (cancelled) return;
        if (statusOf(err) === 403) setForbidden(true);
        else setError(messageOf(err));
      });
    return () => {
      cancelled = true;
    };
  }, [claimId]);

  const lines = React.useMemo(() => claim?.lines ?? [], [claim]);

  React.useEffect(() => {
    if (!onChange) return;
    if (!claim) {
      onChange(null, true);
      return;
    }
    let valid = true;
    const changed: ClaimReviewValue['lines'] = [];
    for (const l of lines) {
      const raw = values[l.id] ?? String(l.amount);
      if (lineError(raw, l.amount)) {
        valid = false;
        continue;
      }
      const v = Math.round(Number(raw) * 100) / 100;
      if (v !== (l.approved_amount ?? l.amount)) changed.push({ id: l.id, approved_amount: v });
    }
    onChange(changed.length ? { lines: changed } : null, valid);
  }, [claim, lines, values, onChange]);

  if (forbidden) return readOnly ? null : <p className="text-xs text-fg-muted sm:text-sm">You can approve the amounts as claimed.</p>;
  if (error) return <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>;
  if (!claim) return <div aria-hidden className="h-40 w-full animate-pulse rounded-lg bg-bg-subtle" />;

  const total = lines.reduce((s, l) => {
    const v = Number(values[l.id]);
    return s + (Number.isFinite(v) && v >= 0 ? Math.min(v, l.amount) : 0);
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-fg sm:text-[13px]">{readOnly ? `${lines.length} ${lines.length === 1 ? 'bill' : 'bills'}` : 'Amounts to approve'}</p>
        <p className="text-xs text-fg-muted">
          Claimed <span className="font-semibold tabular-nums text-fg">{money(claim.claimed_amount)}</span>
        </p>
      </div>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {lines.map((l) => (
          <LineRow
            key={l.id}
            claimId={claim.id}
            line={l}
            readOnly={readOnly}
            value={values[l.id] ?? ''}
            onChange={(v) => setValues((prev) => ({ ...prev, [l.id]: cleanAmount(v) }))}
          />
        ))}
      </ul>
      {!readOnly && (
        <p className="flex items-baseline justify-between text-sm">
          <span className="text-fg-muted">Approving</span>
          <span className="font-bold tabular-nums text-fg">{money(Math.round(total * 100) / 100)}</span>
        </p>
      )}
      {claim.channel === 'wallet' && <p className="text-[11px] text-fg-muted">This is a wallet expense. The approved amount is taken from the employee’s wallet.</p>}
    </div>
  );
}

function LineRow({ claimId, line, readOnly, value, onChange }: { claimId: number; line: LineDto; readOnly?: boolean; value: string; onChange: (v: string) => void }) {
  const Icon = categoryIcon(line.category.icon);
  const err = lineError(value, line.amount);
  const inputId = `approve-line-${line.id}`;
  const sub = [formatDate(line.expense_date, 'medium'), line.merchant, line.invoice_no ? `Bill ${line.invoice_no}` : null, line.description].filter(Boolean).join(' · ');
  const bill = React.useMemo(() => toBillModel(line.bill), [line.bill]);
  const mode = toPaymentMode(line.payment_mode);
  const proofs = line.payment_proofs?.length ?? 0;
  const paid = [mode ? PAYMENT_MODE_LABEL[mode] : null, line.payment_reference ? `Ref ${line.payment_reference}` : null, proofs ? `${proofs} payment ${proofs === 1 ? 'proof' : 'proofs'}` : null].filter(Boolean).join(' · ');
  // The approver's links are the HR file links (they work for the claim's current approver).
  const bills = React.useMemo(() => claimLineFiles(line.attachments, { scope: 'hr', claimId, lineId: line.id }), [claimId, line.id, line.attachments]);
  const proofFiles = React.useMemo(() => claimLineFiles(line.payment_proofs ?? [], { scope: 'hr', claimId, lineId: line.id, payment: true }), [claimId, line.id, line.payment_proofs]);
  const flags = React.useMemo(() => withoutBillNotes(line.flags.map(toFlag)), [line.flags]);
  const approving = Number(value);
  const facts: ReceiptFact[] = [
    { label: 'Claimed', value: money(line.amount) },
    readOnly
      ? { label: 'Approved', value: line.approved_amount !== null && line.approved_amount !== undefined ? money(line.approved_amount) : '—' }
      : { label: 'Approving', value: !err && Number.isFinite(approving) ? money(approving) : '—' },
    { label: 'Date', value: formatDate(line.expense_date, 'medium') },
    { label: 'Bill no.', value: line.invoice_no || '—' },
  ];
  if (bill?.totals.grand !== null && bill?.totals.grand !== undefined) facts.push({ label: 'Bill total', value: money(bill.totals.grand) });
  if (paid) facts.push({ label: 'Paid by', value: paid });
  return (
    <li className="p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{line.category.name}</p>
          {sub && <p className="truncate text-[11px] text-fg-muted sm:text-xs">{sub}</p>}
          {line.category.kind === 'distance' && line.quantity !== null && (
            <p className="text-[11px] text-fg-muted">
              {line.quantity} km × {money(line.rate)}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-fg-muted">
            Claimed <span className="font-semibold tabular-nums text-fg">{money(line.amount)}</span>
            {line.attachments.length ? ` · ${line.attachments.length} receipt${line.attachments.length === 1 ? '' : 's'}` : ' · No receipt'}
          </p>
          {paid && <p className="mt-0.5 text-[11px] text-fg-muted">Paid by <span className="font-semibold text-fg">{paid}</span></p>}
          {flags.map((f) => (
            <p key={f.code} className={cx('mt-1 flex items-start gap-1 text-[11px]', f.severity === 'error' ? 'text-[var(--tt-danger)]' : 'text-fg')}>
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
              {f.message}
            </p>
          ))}
          {line.ai_scanned && <AiMarker label="Filled by AI from the receipt" className="mt-1.5" />}
        </div>
        {!readOnly && <div className="w-full sm:w-36">
          <label htmlFor={inputId} className="sr-only">
            Approved amount for {line.category.name}
          </label>
          <div className={shellClass(Boolean(err))}>
            <span className="shrink-0 text-xs font-semibold text-fg-muted">₹</span>
            <input
              id={inputId}
              inputMode="decimal"
              value={value}
              aria-invalid={Boolean(err) || undefined}
              onChange={(e) => onChange(e.target.value)}
              className="w-full min-w-0 border-none bg-transparent text-right text-sm tabular-nums text-fg outline-none focus:ring-0"
            />
          </div>
          {err && <p role="alert" className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{err}</p>}
        </div>}
      </div>
      {(bill || bills.length > 0 || proofFiles.length > 0) && (
        <div className="mt-2">
          <ReceiptViewer
            layout="compare"
            bills={bills}
            proofs={proofFiles}
            title={[line.category.name, line.merchant].filter(Boolean).join(' · ')}
            subtitle={sub}
            bill={bill}
            fromAi={Boolean(line.ai_scanned)}
            flags={flags}
            facts={facts}
          />
        </div>
      )}
    </li>
  );
}
