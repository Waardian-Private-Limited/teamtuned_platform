'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { OptionCard, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { orgToday } from '@/lib/datetime';
import type { ActionError } from '../../hooks/useClaimActions';
import type { PayRequestDto } from '../../types/reimbursement.dto';
import type { LineAttachment, PayoutMode } from '../../types/reimbursement.model';
import { PAYOUT_MODE_LABEL } from '../../constants/reimbursement.constants';
import { money } from '../../utils/format';
import { ReceiptPicker } from './ReceiptPicker';
import { FormError } from './Primitives';

interface PayDialogProps {
  open: boolean;
  title: string;
  /** One line under the title: who is paid what. */
  summary: React.ReactNode;
  busy: boolean;
  error: ActionError | null;
  onClose: () => void;
  onSubmit: (body: PayRequestDto) => void;
}

/** Records a payment made outside TeamTuned: reference, date and an optional proof. */
export function PayDialog({ open, title, summary, busy, error, onClose, onSubmit }: PayDialogProps) {
  const [reference, setReference] = React.useState('');
  const [paidOn, setPaidOn] = React.useState(orgToday());
  const [proof, setProof] = React.useState<LineAttachment[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    setReference('');
    setPaidOn(orgToday());
    setProof([]);
    setErrors({});
  }, [open]);

  const fieldError = (f: string) => errors[f] || error?.fields[f];
  const known = ['reference', 'paid_on', 'proof'];
  const formError = error ? [error.form, ...Object.entries(error.fields).filter(([k]) => !known.includes(k)).map(([, v]) => v)].filter(Boolean).join(' ') : '';

  const submit = () => {
    const next: Record<string, string> = {};
    if (!reference.trim()) next.reference = 'Enter the bank or transfer reference';
    if (!paidOn) next.paid_on = 'Pick the date it was paid';
    else if (paidOn > orgToday()) next.paid_on = 'The date cannot be in the future';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({ reference: reference.trim(), paid_on: paidOn, proof: proof[0]?.key || undefined });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      title={title}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={busy} disabled={uploading} onClick={submit}>
            Mark as paid
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">{summary}</p>
        <TextField label="Payment reference" required value={reference} onChange={(v) => { setReference(v); setErrors((e) => ({ ...e, reference: '' })); }} placeholder="UTR, cheque or transfer number" maxLength={120} error={fieldError('reference')} />
        <TextField label="Paid on" required type="date" value={paidOn} max={orgToday()} onChange={(v) => { setPaidOn(v); setErrors((e) => ({ ...e, paid_on: '' })); }} error={fieldError('paid_on')} />
        <ReceiptPicker label="Proof of payment" value={proof} onChange={setProof} max={1} scope="proof" onBusyChange={setUploading} error={fieldError('proof')} />
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}

export function PayoutModeDialog({ open, current, busy, error, onClose, onSubmit }: { open: boolean; current: PayoutMode | null; busy: boolean; error: ActionError | null; onClose: () => void; onSubmit: (mode: PayoutMode) => void }) {
  const [mode, setMode] = React.useState<PayoutMode>(current === 'payroll' ? 'manual' : 'payroll');
  React.useEffect(() => {
    if (open) setMode(current === 'payroll' ? 'manual' : 'payroll');
  }, [open, current]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title="Change how it is paid"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={busy} disabled={mode === current} onClick={() => onSubmit(mode)}>
            Save
          </Btn>
        </>
      }
    >
      <div className="space-y-2">
        <OptionCard selected={mode === 'manual'} onClick={() => setMode('manual')} title={PAYOUT_MODE_LABEL.manual} description="Accounts pays it and records the reference, here or in Payouts." />
        <OptionCard selected={mode === 'payroll'} onClick={() => setMode('payroll')} title={PAYOUT_MODE_LABEL.payroll} description="Added as a non-taxable earning in the employee’s next draft pay run. Finalising the run marks it paid." />
        <FormError message={error ? error.form || Object.values(error.fields).join(' ') : ''} className="pt-2" />
      </div>
    </Dialog>
  );
}

export function CancelClaimDialog({ open, amount, busy, error, onClose, onSubmit }: { open: boolean; amount: number; busy: boolean; error: ActionError | null; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = React.useState('');
  const [reasonError, setReasonError] = React.useState('');
  React.useEffect(() => {
    if (!open) return;
    setReason('');
    setReasonError('');
  }, [open]);
  const submit = () => {
    if (!reason.trim()) {
      setReasonError('Say why it is cancelled');
      return;
    }
    onSubmit(reason.trim());
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title="Cancel this expense"
      footer={
        <>
          <Btn onClick={onClose}>Keep it</Btn>
          <Btn variant="danger" busy={busy} onClick={submit}>
            Cancel expense
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          <span className="font-semibold text-fg">{money(amount)}</span> will not be paid. The employee is told why.
        </p>
        <Textarea label="Reason" required value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(''); }} error={reasonError || error?.fields.reason} rows={3} />
        <FormError message={error?.form} />
      </div>
    </Dialog>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, busy, error, onClose, onConfirm }: { open: boolean; title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; busy: boolean; error?: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title={title}
      footer={
        <>
          <Btn onClick={onClose}>Back</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-fg-muted">{message}</p>
        <FormError message={error} />
      </div>
    </Dialog>
  );
}
