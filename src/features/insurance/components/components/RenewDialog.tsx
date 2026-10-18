'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/FormControls';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/insurance.api';
import type { Plan } from '../../types/insurance.types';
import { formErrors } from '../../utils/errors';
import { parseAmount } from '../../utils/format';

function shift(iso: string, days: number, years = 0): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface RenewDialogProps {
  plan: Plan | null;
  onClose: () => void;
  onRenewed: () => void;
}

/** Next policy year: a new plan, with everyone still employed moved across with their family and nominees. */
export function RenewDialog({ plan, onClose, onRenewed }: RenewDialogProps) {
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');
  const [policyNumber, setPolicyNumber] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!plan) return;
    setStart(shift(plan.end_date, 1));
    setEnd(shift(plan.end_date, 0, 1));
    setPolicyNumber('');
    setAmount(plan.premium.amount ? String(plan.premium.amount) : '');
    setErrors({});
    setFormError('');
  }, [plan]);

  const submit = async () => {
    if (!plan) return;
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const res = await api.renewPlan(plan.id, {
        start_date: start, end_date: end, policy_number: policyNumber, premium: { ...plan.premium, amount: Number(parseAmount(amount)) || 0 },
      });
      showSuccess(`Plan renewed. ${res.enrolled} ${res.enrolled === 1 ? 'employee' : 'employees'} moved across${res.skipped.length ? `, ${res.skipped.length} left out` : ''}.`);
      onRenewed();
    } catch (err) {
      const { fields, form } = formErrors(err);
      setErrors(fields);
      setFormError(form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(plan)}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title={plan ? `Renew ${plan.name}` : 'Renew'}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={busy} onClick={submit}>Renew plan</Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <p className="text-xs text-fg-muted">Creates the next year’s plan and moves everyone still employed across with their family and nominees. The current plan runs to its end date.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Starts" required type="date" value={start} onChange={setStart} error={errors.start_date} />
          <TextField label="Ends" required type="date" value={end} onChange={setEnd} error={errors.end_date} />
        </div>
        <TextField label="New policy number" value={policyNumber} onChange={setPolicyNumber} error={errors.policy_number} />
        <TextField label="Yearly premium" inputMode="decimal" prefix="₹" value={amount} onChange={(v) => setAmount(parseAmount(v))} error={errors['premium.amount']} />
        {formError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{formError}</p>}
      </div>
    </Dialog>
  );
}
