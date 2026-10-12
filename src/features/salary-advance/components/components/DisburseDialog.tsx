'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/FormControls';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { orgToday } from '@/lib/datetime';
import type { ActionError } from '../../hooks/useAdvanceActions';
import type { DisburseRequestDto } from '../../types/salaryAdvance.dto';
import type { AdvanceDetail, UploadedFile } from '../../types/salaryAdvance.model';
import { MONTH_KEY, money } from '../../utils/format';
import { AttachmentPicker } from './AttachmentPicker';

interface DisburseDialogProps {
  advance: AdvanceDetail;
  open: boolean;
  busy: boolean;
  error: ActionError | null;
  onClose: () => void;
  onSubmit: (body: DisburseRequestDto) => void;
}

type Field = 'reference' | 'disbursed_on' | 'start_month';

export function DisburseDialog({ advance, open, busy, error, onClose, onSubmit }: DisburseDialogProps) {
  const [reference, setReference] = React.useState('');
  const [paidOn, setPaidOn] = React.useState(orgToday());
  const [startMonth, setStartMonth] = React.useState('');
  const [proof, setProof] = React.useState<UploadedFile[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<Field, string>>>({});

  React.useEffect(() => {
    if (!open) return;
    setReference('');
    setPaidOn(orgToday());
    setStartMonth('');
    setProof([]);
    setErrors({});
  }, [open]);

  const serverField = error?.field as Field | undefined;
  const fieldError = (f: Field) => errors[f] || (serverField === f ? error?.message : undefined);
  const formError = error && !(['reference', 'disbursed_on', 'start_month'] as string[]).includes(error.field || '') ? error.message : '';

  const submit = () => {
    const next: Partial<Record<Field, string>> = {};
    if (!reference.trim()) next.reference = 'Enter the bank or transfer reference';
    if (!paidOn) next.disbursed_on = 'Pick the date it was paid';
    else if (paidOn > orgToday()) next.disbursed_on = 'The payout date cannot be in the future';
    if (startMonth && !MONTH_KEY.test(startMonth)) next.start_month = 'Pick a month';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({ reference: reference.trim(), proof: proof[0], disbursed_on: paidOn, start_month: startMonth || undefined });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      title="Mark as paid out"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={busy} disabled={uploading} onClick={submit}>
            Confirm payout
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Record that <span className="font-semibold text-fg">{money(advance.amount)}</span> was paid to{' '}
          <span className="font-semibold text-fg">{advance.employeeName}</span>. The repayment schedule starts from the month you set, or the policy’s default after the payout date.
        </p>
        <TextField label="Payment reference" required value={reference} onChange={(v) => { setReference(v); setErrors((e) => ({ ...e, reference: undefined })); }} placeholder="UTR, cheque or transfer number" maxLength={120} error={fieldError('reference')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Paid on" required type="date" value={paidOn} max={orgToday()} onChange={(v) => { setPaidOn(v); setErrors((e) => ({ ...e, disbursed_on: undefined })); }} error={fieldError('disbursed_on')} />
          <TextField label="First instalment" type="month" value={startMonth} onChange={(v) => { setStartMonth(v); setErrors((e) => ({ ...e, start_month: undefined })); }} error={fieldError('start_month')} hint="Leave empty for the policy default" />
        </div>
        <AttachmentPicker label="Proof of payment" value={proof} onChange={setProof} max={1} scope="hr" onBusyChange={setUploading} />
        {formError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{formError}</p>}
      </div>
    </Dialog>
  );
}
