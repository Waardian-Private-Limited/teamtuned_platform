'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/FormControls';
import { addDays, formatDate } from '@/lib/datetime';
import { contractEndFor } from '../../utils/contract';
import type { RenewField } from '../../hooks/useEmployeeContract';

interface RenewContractDialogProps {
  open: boolean;
  currentEnd: string;
  busy: boolean;
  errors: Partial<Record<RenewField | 'form', string>>;
  onClose: () => void;
  onRenew: (body: { end_date?: string; months?: number; reason?: string }) => void;
}

/** New end date or a number of months; the new term starts the day after the current end. */
export function RenewContractDialog({ open, currentEnd, busy, errors, onClose, onRenew }: RenewContractDialogProps) {
  const [endDate, setEndDate] = React.useState('');
  const [months, setMonths] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [local, setLocal] = React.useState<Partial<Record<RenewField, string>>>({});

  React.useEffect(() => {
    if (!open) return;
    setEndDate('');
    setMonths('');
    setReason('');
    setLocal({});
  }, [open]);

  const start = addDays(currentEnd, 1);
  const monthsEnd = months.trim() ? contractEndFor(start, Number(months)) : null;

  const submit = () => {
    const m = Number(months);
    if (!endDate && !months.trim()) return setLocal({ end_date: 'Enter the new end date or the number of months' });
    if (months.trim() && (!Number.isInteger(m) || m < 1 || m > 120)) return setLocal({ months: '1 to 120 months' });
    if (endDate && endDate <= currentEnd) return setLocal({ end_date: `Must be after ${formatDate(currentEnd)}` });
    setLocal({});
    onRenew({ ...(endDate ? { end_date: endDate } : { months: m }), ...(reason.trim() ? { reason: reason.trim() } : {}) });
  };

  const btn = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-40 sm:text-sm';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Renew contract"
      maxWidthClassName="max-w-md"
      footer={
        <>
          <button type="button" onClick={onClose} className={`${btn} border border-line bg-surface text-fg hover:bg-bg-subtle`}>Cancel</button>
          <button type="button" disabled={busy} onClick={submit} className={`${btn} bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]`}>
            {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Renew
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-fg-muted">The new term starts on {formatDate(start)}.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="New end date"
            type="date"
            value={endDate}
            onChange={(v) => { setEndDate(v); setMonths(''); setLocal({}); }}
            error={local.end_date || errors.end_date}
          />
          <TextField
            label="Or months"
            type="number"
            min={1}
            max={120}
            value={months}
            onChange={(v) => { setMonths(v); setEndDate(''); setLocal({}); }}
            error={local.months || errors.months}
            hint={monthsEnd ? `Ends ${formatDate(monthsEnd)}` : undefined}
          />
        </div>
        <TextField label="Reason" value={reason} onChange={setReason} maxLength={300} placeholder="Optional" />
        {errors.form && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.form}</p>}
      </div>
    </Dialog>
  );
}
