'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage, TextField } from '@/components/ui/FormControls';
import { MAX_PAYMENT_PROOFS, MAX_PAYMENT_REFERENCE, PAYMENT_MODES } from '../constants/bill.constants';
import type { LineAttachment, PaymentMode, UploadedFile } from '../types/bill.model';
import { ReceiptPicker } from './ReceiptPicker';

export interface PaymentValue {
  mode: PaymentMode | null;
  reference: string;
  proofs: LineAttachment[];
}

interface PaymentFieldsProps {
  value: PaymentValue;
  /** Errors by field: `mode`, `reference`, `proofs`. */
  errors: Partial<Record<keyof PaymentValue, string>>;
  /** What the bill itself says about how it was paid. */
  printed?: string | null;
  onChange: (patch: Partial<PaymentValue>) => void;
  /** Stores one proof file. Must be stable. */
  store: (file: File) => Promise<UploadedFile>;
  onBusyChange: (busy: boolean) => void;
  /** A file was just uploaded from the browser. */
  onLocalFile?: (key: string, file: File) => void;
}

/** How a bill was paid: the mode, the transaction / UPI reference and proof of payment. */
export function PaymentFields({ value, errors, printed, onChange, store, onBusyChange, onLocalFile }: PaymentFieldsProps) {
  const cash = value.mode === 'cash';
  return (
    <div className="tt-fade-in space-y-4">
      <div>
        <FieldLabel label="Paid by" />
        <div role="radiogroup" aria-label="Paid by" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PAYMENT_MODES.map((m) => {
            const on = value.mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ mode: on ? null : m.value })}
                className={cx(
                  'flex h-10 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors sm:text-sm',
                  errors.mode ? 'border-[var(--tt-danger)]' : on ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg hover:bg-bg-subtle'
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <FieldMessage error={errors.mode} hint={printed ? `The bill says: ${printed}` : 'Helps Accounts match the payment.'} />
      </div>

      {!cash && (
        <TextField
          label="Transaction / UPI ref"
          value={value.reference}
          onChange={(v) => onChange({ reference: v })}
          placeholder={value.mode === 'upi' ? 'e.g. 412345678901' : 'Reference or transaction id'}
          maxLength={MAX_PAYMENT_REFERENCE}
          autoComplete="off"
          error={errors.reference}
        />
      )}

      <ReceiptPicker
        label="Payment proof"
        value={value.proofs}
        onChange={(proofs) => onChange({ proofs })}
        max={MAX_PAYMENT_PROOFS}
        error={errors.proofs}
        hint={`Screenshot, card slip or receipt · PDF, JPG or PNG, up to 5 MB each, up to ${MAX_PAYMENT_PROOFS} files`}
        store={store}
        onBusyChange={onBusyChange}
        onUploaded={onLocalFile}
        addLabel="Attach proof"
        compact
      />
    </div>
  );
}
