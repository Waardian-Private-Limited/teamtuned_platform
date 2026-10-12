'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { EmployeePicker } from '@/features/compensation/components/shared/EmployeePicker';
import { MONTH_KEY, money, monthLabel, thisMonth } from '@/features/salary-slips/utils/format';
import type { CompEmployeeDto } from '../../types/otherDeductions.dto';
import type { DeductionFieldErrors, DeductionFormInput } from '../../types/otherDeductions.model';
import { validateDeduction } from '../../utils/validators';

interface AddDeductionDrawerProps {
  open: boolean;
  isSaving: boolean;
  fieldErrors: DeductionFieldErrors;
  formError: string;
  onFieldErrors: (errors: DeductionFieldErrors) => void;
  onClose: () => void;
  onSubmit: (input: DeductionFormInput) => void;
}

function splitPreview(amount: number, count: number) {
  const each = Math.floor((amount / count) * 100) / 100;
  const last = Math.round((amount - each * (count - 1)) * 100) / 100;
  return { each, last };
}

export function AddDeductionDrawer({ open, isSaving, fieldErrors, formError, onFieldErrors, onClose, onSubmit }: AddDeductionDrawerProps) {
  const [employees, setEmployees] = React.useState<CompEmployeeDto[]>([]);
  const [reason, setReason] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [startMonth, setStartMonth] = React.useState(thisMonth());
  const [instalments, setInstalments] = React.useState('1');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setEmployees([]);
    setReason('');
    setAmount('');
    setStartMonth(thisMonth());
    setInstalments('1');
    setNotes('');
  }, [open]);

  const clear = (key: keyof DeductionFieldErrors) => {
    if (fieldErrors[key]) onFieldErrors({ ...fieldErrors, [key]: undefined });
  };

  const amountValue = Number(amount);
  const parsedInstalments = parseInt(instalments, 10);
  const count = Number.isInteger(parsedInstalments) && parsedInstalments > 0 ? parsedInstalments : 1;
  const preview =
    Number.isFinite(amountValue) && amountValue > 0 && MONTH_KEY.test(startMonth)
      ? (() => {
          const { each, last } = splitPreview(amountValue, count);
          const from = monthLabel(startMonth, 'short');
          if (count === 1) return `${money(amountValue)} deducted once, in ${from}`;
          const tail = last !== each ? ` (last month ${money(last)})` : '';
          return `${money(each)} per month for ${count} months, from ${from}${tail}`;
        })()
      : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: DeductionFormInput = {
      employeeIds: employees.map((emp) => emp.id),
      reason,
      amount: amountValue,
      startMonth,
      instalments: Number.isInteger(parsedInstalments) ? parsedInstalments : 0,
      notes,
    };
    const errors = validateDeduction(input);
    if (Object.keys(errors).length) {
      onFieldErrors(errors);
      return;
    }
    onSubmit(input);
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add deduction" maxWidthClassName="sm:max-w-lg">
      <form onSubmit={submit} noValidate className="flex min-h-full flex-col gap-4">
        <EmployeePicker
          multiple
          label="Employees"
          value={employees}
          onChange={(v) => {
            setEmployees(v);
            clear('employee_ids');
          }}
          error={fieldErrors.employee_ids}
        />

        <TextField
          label="Reason"
          required
          value={reason}
          onChange={(v) => {
            setReason(v);
            clear('title');
          }}
          placeholder="For example, Uniform damage"
          maxLength={150}
          error={fieldErrors.title}
          hint="Shown on the payslip"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Total amount"
            required
            inputMode="decimal"
            prefix="₹"
            value={amount}
            onChange={(v) => {
              setAmount(v.replace(/[^\d.]/g, ''));
              clear('amount_value');
            }}
            placeholder="0"
            error={fieldErrors.amount_value}
          />
          <TextField
            label="Start month"
            required
            type="month"
            value={startMonth}
            onChange={(v) => {
              setStartMonth(v);
              clear('payout_month');
            }}
            error={fieldErrors.payout_month}
          />
        </div>

        <TextField
          label="Instalments"
          required
          type="number"
          inputMode="numeric"
          min={1}
          value={instalments}
          onChange={(v) => {
            setInstalments(v.replace(/[^\d]/g, ''));
            clear('installments');
          }}
          placeholder="1"
          error={fieldErrors.installments}
          hint={count <= 1 ? '1 = one-time deduction' : `Deducted over ${count} consecutive months`}
        />

        <p className="min-h-[1.25rem] text-xs font-medium text-fg sm:text-sm" aria-live="polite">
          {preview ? (
            <>
              {preview}
              {employees.length > 1 && <span className="font-normal text-fg-muted">, for each of {employees.length} employees</span>}
            </>
          ) : (
            <span className="font-normal text-fg-muted">Enter an amount to see the monthly split</span>
          )}
        </p>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            clear('notes');
          }}
          maxLength={1000}
          rows={3}
          placeholder="Optional, for HR records"
          error={fieldErrors.notes}
        />

        {formError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{formError}</p>}

        <div className="mt-auto flex justify-end gap-2.5 border-t border-line pt-4">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn type="submit" variant="primary" busy={isSaving}>
            Add deduction
          </Btn>
        </div>
      </form>
    </Drawer>
  );
}
