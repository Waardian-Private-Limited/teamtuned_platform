'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import type { Run } from '../../types/payrollRuns.model';
import { today } from '../../utils/format';
import { actionBtn, Spinner } from './controls';

function Footer({ onClose, onSubmit, busy, label }: { onClose: () => void; onSubmit: () => void; busy: boolean; label: string }) {
  return (
    <>
      <button type="button" className={actionBtn.secondary} onClick={onClose} disabled={busy}>
        Cancel
      </button>
      <button type="button" className={actionBtn.primary} onClick={onSubmit} disabled={busy}>
        {busy && <Spinner />} {label}
      </button>
    </>
  );
}

export function MarkPaidDialog({ run, busy, onClose, onSubmit }: { run: Run | null; busy: boolean; onClose: () => void; onSubmit: (paidOn: string, reference: string) => Promise<string | null> }) {
  const [paidOn, setPaidOn] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [errors, setErrors] = React.useState<{ paidOn?: string; reference?: string }>({});

  React.useEffect(() => {
    if (run) {
      setPaidOn(run.payDate && run.payDate <= today() ? run.payDate : today());
      setReference('');
      setErrors({});
    }
  }, [run]);

  const submit = async () => {
    if (!paidOn) return setErrors({ paidOn: 'Pick the date the salaries were paid' });
    if (paidOn > today()) return setErrors({ paidOn: 'Payment date cannot be in the future' });
    if (run && paidOn < run.periodStart) return setErrors({ paidOn: 'Payment date cannot be before the pay period starts' });
    setErrors({});
    const err = await onSubmit(paidOn, reference);
    if (err) setErrors({ paidOn: err });
  };

  return (
    <Dialog
      open={Boolean(run)}
      onClose={onClose}
      title="Mark payroll as paid"
      maxWidthClassName="max-w-md"
      footer={<Footer onClose={onClose} onSubmit={submit} busy={busy} label="Mark paid" />}
    >
      {run && (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            Record that salaries for <span className="font-semibold text-fg">{run.companyName}</span>, {run.periodLabel}, have reached employees.
          </p>
          <TextField label="Paid on" type="date" required value={paidOn} onChange={(v) => setPaidOn(v)} max={today()} error={errors.paidOn} />
          <TextField
            label="Payment reference"
            value={reference}
            onChange={(v) => setReference(v.slice(0, 120))}
            placeholder="UTR / batch number (optional)"
            error={errors.reference}
          />
        </div>
      )}
    </Dialog>
  );
}

/**
 * Pays one employee's salary on its own. `finalizeFirst`: the payroll is a draft, so this salary is finalized alone first
 * and `others` people move to a new draft batch.
 */
export function PaySalaryDialog({ open, name, finalizeFirst, others, periodStart, payDate, needsApproval, busy, onClose, onSubmit }: {
  open: boolean;
  name: string;
  finalizeFirst: boolean;
  others: number;
  periodStart: string;
  payDate: string | null;
  needsApproval: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (paidOn: string, reference: string, generate: boolean) => Promise<string | null>;
}) {
  const [paidOn, setPaidOn] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [generate, setGenerate] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setPaidOn(payDate && payDate <= today() ? payDate : today());
      setReference('');
      setGenerate(true);
      setError('');
    }
  }, [open, payDate]);

  const submit = async () => {
    if (!paidOn) return setError('Pick the date the salary was paid');
    if (paidOn > today()) return setError('Payment date cannot be in the future');
    if (paidOn < periodStart) return setError('Payment date cannot be before the pay period starts');
    setError('');
    const err = await onSubmit(paidOn, reference, generate);
    if (err) setError(err);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={finalizeFirst ? 'Finalize and pay this salary' : 'Mark this salary paid'}
      maxWidthClassName="max-w-md"
      footer={<Footer onClose={onClose} onSubmit={submit} busy={busy} label={finalizeFirst ? (needsApproval ? 'Send for approval' : 'Finalize and pay') : 'Mark paid'} />}
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Only <span className="font-semibold text-fg">{name}</span>&apos;s salary.
          {finalizeFirst && ' It is finalized on its own first and cannot be changed afterwards.'}
          {finalizeFirst && others > 0 && ` The other ${others} employee${others === 1 ? '' : 's'} move to a new draft batch, to finalize and pay later.`}
        </p>
        {finalizeFirst && needsApproval ? (
          <p className="rounded-lg border border-line-strong bg-bg-subtle px-3 py-2 text-xs font-medium text-fg">
            Finalizing needs approval in this company. It is sent for approval now; mark it paid once it is approved.
          </p>
        ) : (
          <>
            <TextField label="Paid on" type="date" required value={paidOn} onChange={(v) => setPaidOn(v)} max={today()} />
            <TextField label="Payment reference" value={reference} onChange={(v) => setReference(v.slice(0, 100))} placeholder="UTR / cheque number (optional)" />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-fg">
              <input type="checkbox" checked={generate} onChange={(e) => setGenerate(e.target.checked)} className="h-4 w-4 accent-[var(--tt-primary)]" />
              Generate the payslip (the employee sees it in the app)
            </label>
          </>
        )}
        {error && <p className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}

export function ReopenDialog({ run, busy, onClose, onSubmit }: { run: Run | null; busy: boolean; onClose: () => void; onSubmit: (reason: string) => Promise<string | null> }) {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (run) {
      setReason('');
      setError('');
    }
  }, [run]);

  const submit = async () => {
    const r = reason.trim();
    if (r.length < 5) return setError('Tell the approver why this payroll needs to be reopened');
    setError('');
    const err = await onSubmit(r);
    if (err) setError(err);
  };

  return (
    <Dialog
      open={Boolean(run)}
      onClose={onClose}
      title="Reopen payroll"
      maxWidthClassName="max-w-md"
      footer={<Footer onClose={onClose} onSubmit={submit} busy={busy} label="Send for approval" />}
    >
      {run && (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            Reopening unlocks <span className="font-semibold text-fg">{run.companyName}</span>, {run.periodLabel}, for changes. It goes to the approval flow first; payroll stays finalized until it is approved.
          </p>
          <Textarea
            label="Reason"
            required
            rows={4}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What has to change and why"
            error={error}
          />
        </div>
      )}
    </Dialog>
  );
}

export function HoldDialog({
  open,
  holding,
  name,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  holding: boolean;
  name: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);

  const submit = async () => {
    const r = reason.trim();
    if (holding && r.length < 3) return setError('A reason is needed to hold a salary');
    setError('');
    const err = await onSubmit(r);
    if (err) setError(err);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={holding ? 'Hold salary' : 'Release hold'}
      maxWidthClassName="max-w-md"
      footer={<Footer onClose={onClose} onSubmit={submit} busy={busy} label={holding ? 'Hold salary' : 'Release hold'} />}
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          {holding ? (
            <>
              <span className="font-semibold text-fg">{name}</span> stays in this payroll, but the payslip is hidden from the app and left out of the bank transfer until the hold is released. In a finalized payroll, advance instalments and reimbursements in it go back to pending.
            </>
          ) : (
            <>
              <span className="font-semibold text-fg">{name}</span> will be paid with this payroll again: back in the payment queue, with advance, reimbursement and insurance lines settled. A generated payslip becomes visible in the app again.
            </>
          )}
        </p>
        {holding && (
          <Textarea
            label="Reason"
            required
            rows={3}
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Exit formalities pending"
            error={error}
          />
        )}
        {!holding && error && <p className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}
