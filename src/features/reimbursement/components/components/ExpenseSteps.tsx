'use client';

import React from 'react';
import { PenLine, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { PaymentFields } from '@/features/expense-bills/components/PaymentFields';
import * as api from '../../api/reimbursement.api';
import { PAYMENT_MODE_LABEL } from '../../constants/reimbursement.constants';
import type { Category, ClaimPreviewLine, LineInput } from '../../types/reimbursement.model';
import { withServerCheck, withoutBillNotes } from '@/features/expense-bills/utils/bill';
import { lineKey } from '../../utils/errors';
import { dateText, money } from '../../utils/format';
import { AiMarker } from '@/features/expense-bills/components/BillPanel';
import { CategoryIcon } from './Primitives';
import { ReceiptViewer, type ReceiptFile } from '@/features/expense-bills/components/ReceiptViewer';
import { FlagList } from './StatusBadges';
import { lineAmount } from './LineEditor';

export { STEPS, StepHeader, type Step } from '@/features/expense-bills/components/StepHeader';
import type { Step } from '@/features/expense-bills/components/StepHeader';

/** Fields of a line edited on the payment step; every other line field is on the details step. */
export const PAYMENT_FIELDS = new Set(['payment_mode', 'payment_reference', 'payment_proofs']);

/** The step a line error belongs to. */
export function stepOfField(field: string): Step {
  return PAYMENT_FIELDS.has(field) ? 3 : 2;
}

// ── Step 3: payment ─────────────────────────────────────────────────────────

interface PaymentStepProps {
  index: number;
  line: LineInput;
  errors: Record<string, string>;
  uploadScope: api.UploadScope;
  employeeId?: number | null;
  onChange: (patch: Partial<LineInput>) => void;
  onClearError: (key: string) => void;
  onBusyChange: (busy: boolean) => void;
  /** A file was just uploaded from the browser. */
  onLocalFile?: (key: string, file: File) => void;
}

/** Step 3 of a bill: how the employee paid it, the transaction / UPI reference and proof of payment. */
export function PaymentStep({ index, line, errors, uploadScope, employeeId, onChange, onClearError, onBusyChange, onLocalFile }: PaymentStepProps) {
  const store = React.useCallback((file: File) => api.uploadAttachment(file, uploadScope, employeeId), [uploadScope, employeeId]);
  const fields = { mode: 'payment_mode', reference: 'payment_reference', proofs: 'payment_proofs' } as const;
  return (
    <PaymentFields
      value={{ mode: line.paymentMode, reference: line.paymentReference, proofs: line.paymentProofs }}
      errors={{ mode: errors[lineKey(index, fields.mode)], reference: errors[lineKey(index, fields.reference)], proofs: errors[lineKey(index, fields.proofs)] }}
      printed={line.bill?.paymentMode}
      onChange={(patch) => {
        const next: Partial<LineInput> = {};
        if ('mode' in patch) next.paymentMode = patch.mode ?? null;
        if ('reference' in patch) next.paymentReference = patch.reference ?? '';
        if ('proofs' in patch) next.paymentProofs = patch.proofs ?? [];
        onChange(next);
        (Object.keys(patch) as Array<keyof typeof fields>).forEach((k) => onClearError(lineKey(index, fields[k])));
      }}
      store={store}
      onBusyChange={onBusyChange}
      onLocalFile={onLocalFile}
    />
  );
}

// ── Step 4: one bill in the review ──────────────────────────────────────────

interface BillReviewCardProps {
  index: number;
  line: LineInput;
  category: Category | undefined;
  preview: ClaimPreviewLine | null;
  errors: Record<string, string>;
  onEdit: (step: Step) => void;
  onRemove: (() => void) | null;
  /** The bill copies and payment proofs as previewable files. */
  receipts?: { bills: ReceiptFile[]; proofs: ReceiptFile[] };
}

/** A bill on the review step: what it is, the invoice as checked, how it was paid, and anything to fix. */
export function BillReviewCard({ index, line, category, preview, errors, onEdit, onRemove, receipts }: BillReviewCardProps) {
  const prefix = `lines[${index}].`;
  const lineErrors = Object.entries(errors).filter(([k]) => k.startsWith(prefix));
  const firstStep: Step = lineErrors.some(([k]) => stepOfField(k.slice(prefix.length)) === 2) ? 2 : lineErrors.length ? 3 : 2;
  const amount = lineAmount(line, category, preview);
  const distance = category?.kind === 'distance';
  const bill = line.bill ? (preview?.bill ? withServerCheck(line.bill, preview.bill) : line.bill) : null;
  const flags = preview ? withoutBillNotes(preview.flags) : [];
  const paid = [
    line.paymentMode ? PAYMENT_MODE_LABEL[line.paymentMode] : null,
    line.paymentReference.trim() ? `Ref ${line.paymentReference.trim()}` : null,
    line.paymentProofs.length ? `${line.paymentProofs.length} ${line.paymentProofs.length === 1 ? 'proof' : 'proofs'}` : null,
  ].filter(Boolean);
  const files = line.attachments.length;

  return (
    <li className={cx('tt-fade-in rounded-xl border bg-surface p-3 sm:p-4', lineErrors.length ? 'border-[var(--tt-danger)]' : 'border-line')}>
      <div className="flex items-start gap-3">
        <CategoryIcon icon={category?.icon} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="min-w-0 text-sm font-semibold text-fg">
              <span className="mr-1.5 text-[11px] font-bold uppercase tracking-wide text-fg-muted">Bill {index + 1}</span>
              {category?.name || 'No category'}
              {line.merchant.trim() && <span className="font-normal text-fg-muted"> · {line.merchant.trim()}</span>}
            </p>
            <p className="text-sm font-bold tabular-nums text-fg">{money(amount)}</p>
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">
            {[
              line.expenseDate ? dateText(line.expenseDate) : 'No date',
              distance && line.quantity ? `${line.quantity} km` : null,
              files ? `${files} ${files === 1 ? 'file' : 'files'} attached` : 'No bill copy',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {line.description.trim() && <p className="mt-1 text-xs text-fg">{line.description.trim()}</p>}
          {line.aiScanned && <AiMarker label="Filled by AI from the bill" className="mt-1.5" />}
        </div>
      </div>

      {(bill || receipts?.bills.length || receipts?.proofs.length) ? (
        <div className="mt-3">
          <ReceiptViewer
            bills={receipts?.bills ?? []}
            proofs={receipts?.proofs ?? []}
            title={[`Bill ${index + 1}`, category?.name, line.merchant.trim()].filter(Boolean).join(' · ')}
            subtitle={[line.expenseDate ? dateText(line.expenseDate) : null, line.invoiceNo.trim() ? `Bill ${line.invoiceNo.trim()}` : null, money(amount)].filter(Boolean).join(' · ')}
            bill={bill}
            checked={Boolean(preview?.bill)}
            flags={flags}
            facts={[
              { label: 'Amount', value: money(amount) },
              { label: 'Date', value: line.expenseDate ? dateText(line.expenseDate) : '—' },
              { label: 'Bill no.', value: line.invoiceNo.trim() || '—' },
              { label: 'Paid by', value: paid.length ? paid.join(' · ') : '—' },
            ]}
          />
        </div>
      ) : null}

      <p className="mt-3 text-xs">
        <span className="text-fg-muted">Paid by </span>
        <span className={paid.length ? 'font-semibold text-fg' : 'text-fg-muted'}>{paid.length ? paid.join(' · ') : 'Not given'}</span>
      </p>

      {flags.length > 0 && (
        <div className="mt-2 rounded-lg bg-bg-subtle px-3 py-2">
          <FlagList flags={flags} compact />
        </div>
      )}

      {lineErrors.length > 0 && (
        <ul className="mt-2 space-y-0.5" role="alert">
          {lineErrors.map(([k, v]) => (
            <li key={k} className="text-xs font-medium text-[var(--tt-danger)]">
              {v}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
        {onRemove && (
          <button type="button" onClick={onRemove} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Remove
          </button>
        )}
        <button type="button" onClick={() => onEdit(3)} className="inline-flex h-8 items-center rounded-lg border border-line px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle">
          Payment
        </button>
        <button
          type="button"
          onClick={() => onEdit(lineErrors.length ? firstStep : 2)}
          className={cx('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors', lineErrors.length ? 'bg-fg text-[var(--tt-on-primary)] hover:opacity-90' : 'border border-line text-fg hover:bg-bg-subtle')}
        >
          <PenLine className="h-3.5 w-3.5" aria-hidden />
          {lineErrors.length ? 'Fix' : 'Edit'}
        </button>
      </div>
    </li>
  );
}
