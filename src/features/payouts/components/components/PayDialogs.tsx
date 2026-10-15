'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { orgToday } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { AttachmentPicker } from '@/features/salary-advance/components/components/AttachmentPicker';
import type { UploadedFile } from '@/features/salary-advance/types/salaryAdvance.model';
import { money } from '@/features/salary-advance/utils/format';
import * as api from '../../api/payouts.api';
import type { MarkResultDto } from '../../types/payouts.dto';
import type { Payout } from '../../types/payouts.model';

function errorsOf(err: unknown): Record<string, string> {
  const data = (err as { data?: { errors?: Record<string, string> } })?.data;
  return data?.errors && typeof data.errors === 'object' ? data.errors : {};
}

function report(result: MarkResultDto, rows: Payout[]) {
  const names = new Map(rows.map((r) => [r.key, r.employeeName]));
  const done = result.paid ?? result.changed ?? 0;
  const problems = [
    ...result.failed.map((f) => `${names.get(f.key) || f.key}: ${f.message}`),
    ...result.skipped.map((k) => `${names.get(k) || k}: already done or no longer due`),
  ];
  return { done, problems };
}

function Problems({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div role="alert" className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-[var(--tt-danger)]/30 bg-[var(--tt-danger-soft)] p-3 text-xs text-[var(--tt-danger)]">
      {items.map((p) => <p key={p}>{p}</p>)}
    </div>
  );
}

interface DialogProps {
  open: boolean;
  rows: Payout[];
  onClose: () => void;
  onDone: () => void;
}

export function MarkPaidDialog({ open, rows, onClose, onDone }: DialogProps) {
  const [paidOn, setPaidOn] = React.useState(orgToday());
  const [reference, setReference] = React.useState('');
  const [proof, setProof] = React.useState<UploadedFile[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [problems, setProblems] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setPaidOn(orgToday());
    setReference('');
    setProof([]);
    setErrors({});
    setProblems([]);
  }, [open]);

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const hasAdvance = rows.some((r) => r.source === 'advance');
  const needsReference = rows.some((r) => r.source !== 'salary');
  const salaries = rows.filter((r) => r.source === 'salary').length;

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!paidOn) next.paid_on = 'Pick the date it was paid';
    else if (paidOn > orgToday()) next.paid_on = 'The date cannot be in the future';
    if (needsReference && !reference.trim()) next.reference = 'Enter the payment reference';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setProblems([]);
    try {
      const result = await api.markPaid({ keys: rows.map((r) => r.key), paid_on: paidOn, reference: reference.trim() || undefined, proof: proof[0] });
      const { done, problems: left } = report(result, rows);
      if (done) showSuccess(`${done} ${done === 1 ? 'payment' : 'payments'} marked paid`);
      if (left.length) {
        setProblems(left);
        if (done) onDone();
      } else {
        onDone();
        onClose();
      }
    } catch (err) {
      const fields = errorsOf(err);
      if (Object.keys(fields).length) setErrors(fields);
      else setProblems([messageOf(err)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      title="Mark paid"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} disabled={uploading || !rows.length} onClick={submit}>Mark {rows.length} paid</Btn></>}
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          <span className="font-semibold text-fg">{money(total)}</span> to {rows.length} {rows.length === 1 ? 'person' : 'people'}
          {salaries > 0 && needsReference ? ` (${salaries} salaries, ${rows.length - salaries} other payments)` : ''}.
          {hasAdvance ? ' Each advance starts its repayment plan from this date.' : ''}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Paid on" required type="date" value={paidOn} max={orgToday()} onChange={(v) => { setPaidOn(v); setErrors((e) => ({ ...e, paid_on: '' })); }} error={errors.paid_on || undefined} />
          <TextField
            label="Payment reference"
            required={needsReference}
            value={reference}
            onChange={(v) => { setReference(v); setErrors((e) => ({ ...e, reference: '' })); }}
            placeholder="UTR or batch number"
            maxLength={100}
            error={errors.reference || undefined}
          />
        </div>
        {hasAdvance && <AttachmentPicker label="Proof of payment (advances)" value={proof} onChange={setProof} max={1} scope="payouts" onBusyChange={setUploading} />}
        {errors.keys && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.keys}</p>}
        <Problems items={problems} />
      </div>
    </Dialog>
  );
}

export function MarkFailedDialog({ open, rows, onClose, onDone }: DialogProps) {
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [problems, setProblems] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setNote('');
    setError('');
    setProblems([]);
  }, [open]);

  const submit = async () => {
    if (!note.trim()) {
      setError('Say why the payment failed');
      return;
    }
    setBusy(true);
    try {
      const result = await api.markFailed(rows.map((r) => r.key), note.trim());
      const { done, problems: left } = report(result, rows);
      if (done) showSuccess(`${done} ${done === 1 ? 'payment' : 'payments'} back in To pay`);
      if (left.length) {
        setProblems(left);
        if (done) onDone();
      } else {
        onDone();
        onClose();
      }
    } catch (err) {
      setError(errorsOf(err).note || messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title="Payment failed"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="danger" busy={busy} onClick={submit}>Mark failed</Btn></>}
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">The selected salaries go back to To pay with this reason, and their payroll is no longer marked fully paid.</p>
        <Textarea label="Reason" required value={note} maxLength={300} rows={3} placeholder="For example, account closed" error={error} onChange={(e) => { setNote(e.target.value); setError(''); }} />
        <Problems items={problems} />
      </div>
    </Dialog>
  );
}
