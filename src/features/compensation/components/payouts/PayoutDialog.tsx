'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/compensation.api';
import { AMOUNT_MODES } from '../../constants/compensation.constants';
import type { AmountMode, CompEmployeeDto } from '../../types/compensation.dto';
import { currentMonth, inr } from '../../utils/format';
import { Btn } from '../shared/Buttons';
import { EmployeePicker } from '../shared/EmployeePicker';

interface Props {
  open: boolean;
  payoutTypes: { value: string; label: string; taxable: boolean }[];
  onClose: () => void;
  onSaved: () => void;
}

export function PayoutDialog({ open, payoutTypes, onClose, onSaved }: Props) {
  const [employees, setEmployees] = React.useState<CompEmployeeDto[]>([]);
  const [type, setType] = React.useState('performance_bonus');
  const [title, setTitle] = React.useState('');
  const [mode, setMode] = React.useState<AmountMode>('fixed');
  const [value, setValue] = React.useState('');
  const [monthKey, setMonthKey] = React.useState(currentMonth());
  const [installments, setInstallments] = React.useState('1');
  const [clawback, setClawback] = React.useState('0');
  const [taxable, setTaxable] = React.useState(true);
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setEmployees([]);
    setType('performance_bonus');
    setTitle('');
    setMode('fixed');
    setValue('');
    setMonthKey(currentMonth());
    setInstallments('1');
    setClawback('0');
    setTaxable(true);
    setNotes('');
    setErrors({});
  }, [open]);

  React.useEffect(() => {
    const t = payoutTypes.find((p) => p.value === type);
    if (t) setTaxable(t.taxable);
    if (type === 'joining_bonus' || type === 'retention_bonus') setClawback((c) => (c === '0' ? '12' : c));
  }, [type, payoutTypes]);

  const estimate = React.useMemo(() => {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return null;
    if (mode === 'fixed') return v * employees.length;
    const base = (e: CompEmployeeDto) => (mode === 'percent_gross' ? e.monthly_gross || 0 : mode === 'percent_ctc' ? e.ctc || 0 : (e.monthly_gross || 0) * 0.5);
    return employees.reduce((s, e) => s + (base(e) * v) / 100, 0);
  }, [value, mode, employees]);

  const save = async (submit: boolean) => {
    const found: Record<string, string> = {};
    if (!employees.length) found.employee_ids = 'Pick at least one employee';
    if (!(Number(value) > 0)) found.amount_value = 'Enter an amount';
    if (!/^\d{4}-\d{2}$/.test(monthKey)) found.payout_month = 'Pick the payroll month';
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const res = await api.createPayouts({
        employee_ids: employees.map((e) => e.id),
        payout_type: type,
        title: title.trim() || null,
        amount_mode: mode,
        amount_value: Number(value),
        payout_month: monthKey,
        installments: Number(installments) || 1,
        clawback_months: Number(clawback) || 0,
        taxable,
        notes: notes.trim() || null,
        submit,
      });
      showSuccess(`${res.created} payout${res.created === 1 ? '' : 's'} created${res.skipped.length ? `, ${res.skipped.length} skipped` : ''}`);
      onSaved();
      onClose();
    } catch (err) {
      const field = err instanceof ApiError ? (err.data as { field?: string } | null)?.field : undefined;
      setErrors({ [field || 'amount_value']: messageOf(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      title={<h2 className="text-sm font-bold text-fg sm:text-base">New bonus or payout</h2>}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn busy={saving} onClick={() => save(false)}>Save draft</Btn>
          <Btn variant="primary" busy={saving} onClick={() => save(true)}>Submit</Btn>
        </>
      }
    >
      <div className="space-y-4">
        <EmployeePicker multiple label="Employees" value={employees} onChange={setEmployees} error={errors.employee_ids} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField<string> label="Type" required value={type} onChange={(v) => setType(v || 'performance_bonus')} options={payoutTypes} />
          <TextField label="Title on payslip" value={title} onChange={setTitle} placeholder="Defaults to the type name" maxLength={150} />
          <SelectField<AmountMode> label="Amount" required value={mode} onChange={(v) => setMode(v || 'fixed')} options={AMOUNT_MODES.map((m) => ({ value: m.value, label: m.label }))} />
          <TextField label={mode === 'fixed' ? 'Amount per employee (₹)' : 'Percent'} required inputMode="decimal" value={value} onChange={(v) => setValue(v.replace(/[^\d.]/g, ''))} error={errors.amount_value} hint={estimate ? `About ${inr(estimate)} in total` : undefined} />
          <TextField label="Payroll month" required type="month" value={monthKey} onChange={setMonthKey} error={errors.payout_month} />
          <TextField label="Split into installments" type="number" min={1} max={24} value={installments} onChange={setInstallments} hint="Paid in consecutive months" />
          <TextField label="Clawback period (months)" type="number" min={0} max={60} value={clawback} onChange={setClawback} hint="Recover if the employee leaves early" />
          <SelectField<string> label="Tax treatment" value={taxable ? 'taxable' : 'exempt'} onChange={(v) => setTaxable(v !== 'exempt')} options={[{ value: 'taxable', label: 'Taxable (added to TDS income)' }, { value: 'exempt', label: 'Exempt' }]} />
        </div>
        <TextField label="Notes" value={notes} onChange={setNotes} maxLength={1000} />
      </div>
    </Dialog>
  );
}
