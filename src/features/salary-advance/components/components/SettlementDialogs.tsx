'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, OptionCard, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { orgToday } from '@/lib/datetime';
import type { ActionError } from '../../hooks/useAdvanceActions';
import type { AdvanceDetail } from '../../types/salaryAdvance.model';
import { money, parseAmount } from '../../utils/format';

interface BaseProps {
  advance: AdvanceDetail;
  open: boolean;
  busy: boolean;
  error: ActionError | null;
  onClose: () => void;
}

function split(error: ActionError | null, fields: string[]) {
  return {
    fieldError: (f: string) => (error && error.field === f ? error.message : undefined),
    formError: error && !fields.includes(error.field || '') ? error.message : '',
  };
}

function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{message}</p> : null;
}

export function RepaymentDialog({ advance, open, busy, error, onClose, onSubmit }: BaseProps & { onSubmit: (amount: number, reference: string, paidOn: string) => void }) {
  const [amount, setAmount] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [paidOn, setPaidOn] = React.useState(orgToday());
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const server = split(error, ['amount', 'reference', 'paid_on']);

  React.useEffect(() => {
    if (!open) return;
    setAmount('');
    setReference('');
    setPaidOn(orgToday());
    setErrors({});
  }, [open]);

  const value = Number(amount);
  const forecloses = value >= advance.outstanding && advance.outstanding > 0;

  const submit = () => {
    const next: Record<string, string> = {};
    if (!Number.isFinite(value) || value <= 0) next.amount = 'Enter an amount greater than zero';
    if (!reference.trim()) next.reference = 'Enter the receipt or transfer reference';
    if (!paidOn) next.paid_on = 'Pick the date it was paid';
    else if (paidOn > orgToday()) next.paid_on = 'The date cannot be in the future';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit(value, reference.trim(), paidOn);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-md" title="Record repayment" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={submit}>Record</Btn></>}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">Money repaid outside payroll is applied to the oldest instalments first.</p>
        <TextField
          label="Amount"
          required
          inputMode="decimal"
          prefix="₹"
          value={amount}
          onChange={(v) => { setAmount(parseAmount(v)); setErrors((e) => ({ ...e, amount: undefined })); }}
          error={errors.amount || server.fieldError('amount')}
          hint={forecloses ? 'This clears the advance and closes it' : `Outstanding ${money(advance.outstanding)}`}
          aside={<span className="mb-1.5"><Chip active={value === advance.outstanding} onClick={() => setAmount(String(advance.outstanding))}>Full balance</Chip></span>}
        />
        <TextField label="Reference" required value={reference} onChange={(v) => { setReference(v); setErrors((e) => ({ ...e, reference: undefined })); }} maxLength={120} error={errors.reference || server.fieldError('reference')} />
        <TextField label="Paid on" required type="date" max={orgToday()} value={paidOn} onChange={(v) => { setPaidOn(v); setErrors((e) => ({ ...e, paid_on: undefined })); }} error={errors.paid_on || server.fieldError('paid_on')} />
        <FormError message={server.formError} />
      </div>
    </Dialog>
  );
}

export function WaiveDialog({ advance, open, busy, error, onClose, onSubmit }: BaseProps & { onSubmit: (reason: string, writeOff: boolean) => void }) {
  const [reason, setReason] = React.useState('');
  const [writeOff, setWriteOff] = React.useState(false);
  const [reasonError, setReasonError] = React.useState('');
  const server = split(error, ['reason']);

  React.useEffect(() => {
    if (!open) return;
    setReason('');
    setWriteOff(false);
    setReasonError('');
  }, [open]);

  const submit = () => {
    if (!reason.trim()) {
      setReasonError('Enter why the balance is not being recovered');
      return;
    }
    onSubmit(reason.trim(), writeOff);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      title="Waive or write off"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="danger" busy={busy} onClick={submit}>{writeOff ? 'Write off' : 'Waive balance'}</Btn></>}
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          <span className="font-semibold text-fg">{money(advance.outstanding)}</span> will no longer be recovered from {advance.employeeName}. This cannot be undone.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <OptionCard selected={!writeOff} onClick={() => setWriteOff(false)} title="Waive" description="Forgiven, for example as a goodwill gesture" />
          <OptionCard selected={writeOff} onClick={() => setWriteOff(true)} title="Write off" description="Cannot be recovered, for example after exit" />
        </div>
        <Textarea label="Reason" required rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(''); }} error={reasonError || server.fieldError('reason')} />
        <FormError message={server.formError} />
      </div>
    </Dialog>
  );
}

export function CancelAdvanceDialog({ advance, open, busy, error, onClose, onSubmit, mine }: BaseProps & { onSubmit: (reason: string) => void; mine?: boolean }) {
  const [reason, setReason] = React.useState('');
  const [reasonError, setReasonError] = React.useState('');
  const server = split(error, mine ? [] : ['reason']);

  React.useEffect(() => {
    if (!open) return;
    setReason('');
    setReasonError('');
  }, [open]);

  const submit = () => {
    if (!mine && !reason.trim()) {
      setReasonError('Enter why it is being cancelled');
      return;
    }
    onSubmit(reason.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title={mine ? 'Cancel request' : 'Cancel advance'}
      footer={<><Btn onClick={onClose}>Keep</Btn><Btn variant="danger" busy={busy} onClick={submit}>{mine ? 'Cancel request' : 'Cancel advance'}</Btn></>}
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          {mine ? (
            <>Your request for <span className="font-semibold text-fg">{money(advance.amount)}</span> is withdrawn from approval.</>
          ) : (
            <>The {advance.typeName.toLowerCase()} of <span className="font-semibold text-fg">{money(advance.amount)}</span> for <span className="font-semibold text-fg">{advance.employeeName}</span> will not be paid out.</>
          )}
        </p>
        {!mine && <Textarea label="Reason" required rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(''); }} error={reasonError || server.fieldError('reason')} />}
        <FormError message={server.formError} />
      </div>
    </Dialog>
  );
}
