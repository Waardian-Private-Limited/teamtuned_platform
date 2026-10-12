'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { OptionCard, SelectField, TextField } from '@/components/ui/FormControls';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import type { ActionError } from '../../hooks/useAdvanceActions';
import type { AdvanceDetail } from '../../types/salaryAdvance.model';
import { MONTH_KEY, money, monthLabel, parseAmount, thisMonth } from '../../utils/format';
import { InstallmentStepper } from './InstallmentStepper';

interface BaseProps {
  advance: AdvanceDetail;
  open: boolean;
  busy: boolean;
  error: ActionError | null;
  onClose: () => void;
}

function useServerError(error: ActionError | null, fields: string[]) {
  return {
    fieldError: (f: string) => (error && error.field === f ? error.message : undefined),
    formError: error && !fields.includes(error.field || '') ? error.message : '',
  };
}

function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{message}</p> : null;
}

function openInstallments(advance: AdvanceDetail) {
  return advance.schedule.filter((i) => i.status === 'scheduled' || i.status === 'carried' || i.status === 'partial');
}

export function SkipMonthDialog({ advance, open, busy, error, onClose, onSubmit }: BaseProps & { onSubmit: (monthKey: string, mode: 'push' | 'merge') => void }) {
  const months = React.useMemo(() => Array.from(new Set(openInstallments(advance).map((i) => i.month))), [advance]);
  const [month, setMonth] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'push' | 'merge'>('push');
  const [monthError, setMonthError] = React.useState('');
  const server = useServerError(error, ['month_key', 'mode']);

  React.useEffect(() => {
    if (!open) return;
    setMonth(months[0] ?? null);
    setMode('push');
    setMonthError('');
  }, [open, months]);

  const submit = () => {
    if (!month) {
      setMonthError('Pick the month to skip');
      return;
    }
    onSubmit(month, mode);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-lg" title="Skip a month" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={submit}>Skip month</Btn></>}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">Nothing is recovered in the skipped month’s payroll. Choose where that instalment goes.</p>
        <SelectField
          label="Month"
          required
          value={month}
          onChange={(v) => { setMonth(v); setMonthError(''); }}
          options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
          placeholder={months.length ? 'Select…' : 'No instalments left to skip'}
          error={monthError || server.fieldError('month_key')}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <OptionCard selected={mode === 'push'} onClick={() => setMode('push')} title="Move to the end" description="Adds one more month to the schedule" />
          <OptionCard selected={mode === 'merge'} onClick={() => setMode('merge')} title="Add to next month" description="The next instalment is larger" />
        </div>
        <FormError message={server.formError} />
      </div>
    </Dialog>
  );
}

export function PauseDialog({ advance, open, busy, error, onClose, onSubmit }: BaseProps & { onSubmit: (untilMonth: string) => void }) {
  const [until, setUntil] = React.useState('');
  const [untilError, setUntilError] = React.useState('');
  const server = useServerError(error, ['until_month']);
  const first = openInstallments(advance)[0]?.month ?? thisMonth();

  React.useEffect(() => {
    if (!open) return;
    setUntil('');
    setUntilError('');
  }, [open]);

  const submit = () => {
    if (!MONTH_KEY.test(until)) {
      setUntilError('Pick the month recovery should resume');
      return;
    }
    if (until <= thisMonth()) {
      setUntilError('Pick a month after the current one');
      return;
    }
    onSubmit(until);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-md" title="Pause recovery" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={submit}>Pause</Btn></>}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          No instalments are recovered before the month you pick. Every remaining instalment from {monthLabel(first, 'short')} moves forward by the same number of months.
        </p>
        <TextField label="Resume recovery in" required type="month" value={until} onChange={(v) => { setUntil(v); setUntilError(''); }} error={untilError || server.fieldError('until_month')} />
        <FormError message={server.formError} />
      </div>
    </Dialog>
  );
}

type ReshapeBody = { installment_amount?: number; installments?: number; start_month?: string };

export function ReshapeDialog({ advance, open, busy, error, onClose, onSubmit }: BaseProps & { onSubmit: (body: ReshapeBody) => void }) {
  const [by, setBy] = React.useState<'months' | 'amount'>('months');
  const [amount, setAmount] = React.useState('');
  const [months, setMonths] = React.useState(1);
  const [start, setStart] = React.useState('');
  const [fieldError, setFieldError] = React.useState('');
  const server = useServerError(error, ['installment_amount', 'installments', 'start_month']);
  const left = openInstallments(advance);

  React.useEffect(() => {
    if (!open) return;
    setBy('months');
    setAmount(advance.installmentAmount ? String(advance.installmentAmount) : '');
    setMonths(Math.max(1, left.length));
    setStart('');
    setFieldError('');
  }, [open, advance.installmentAmount, left.length]);

  const value = Number(amount);
  const each = by === 'months' ? Math.min(advance.outstanding, Math.ceil(advance.outstanding / Math.max(1, months))) : value;
  const count = each > 0 ? Math.ceil(advance.outstanding / each) : 0;

  const submit = () => {
    if (by === 'amount') {
      if (!Number.isFinite(value) || value <= 0) return setFieldError('Enter an amount greater than zero');
      if (value > advance.outstanding) return setFieldError(`The outstanding balance is ${money(advance.outstanding)}`);
    }
    if (start && (!MONTH_KEY.test(start) || start < thisMonth())) return setFieldError('Pick this month or later');
    onSubmit({
      ...(by === 'amount' ? { installment_amount: value } : { installments: months }),
      ...(start ? { start_month: start } : {}),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-md" title="Redesign instalments" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={submit}>Save</Btn></>}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          The remaining <span className="font-semibold text-fg">{money(advance.outstanding)}</span> is spread again. What was already recovered stays as it is.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <OptionCard selected={by === 'months'} onClick={() => { setBy('months'); setFieldError(''); }} title="Number of months" />
          <OptionCard selected={by === 'amount'} onClick={() => { setBy('amount'); setFieldError(''); }} title="Monthly amount" />
        </div>
        {by === 'months' ? (
          <InstallmentStepper value={months} onChange={(n) => { setMonths(n); setFieldError(''); }} max={60} error={server.fieldError('installments')} hint={`About ${money(each)} a month`} />
        ) : (
          <TextField
            label="Monthly instalment"
            required
            inputMode="decimal"
            prefix="₹"
            value={amount}
            onChange={(v) => { setAmount(parseAmount(v)); setFieldError(''); }}
            error={fieldError || server.fieldError('installment_amount')}
            hint={count > 0 ? `About ${count} ${count === 1 ? 'month' : 'months'} to clear` : undefined}
          />
        )}
        <TextField
          label="From month"
          type="month"
          min={thisMonth()}
          value={start}
          onChange={(v) => { setStart(v); setFieldError(''); }}
          error={(by === 'months' ? fieldError : '') || server.fieldError('start_month')}
          hint={start ? undefined : `Empty: keeps ${left[0] ? monthLabel(left[0].month, 'short') : 'the next due month'}`}
        />
        <FormError message={server.formError} />
      </div>
    </Dialog>
  );
}
