'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { OptionCard, SelectField, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { EmployeePicker } from '@/features/compensation/components/shared/EmployeePicker';
import type { CompEmployeeDto } from '@/features/compensation/types/compensation.dto';
import { addMonths } from '@/lib/datetime';
import { useEligibility } from '../../hooks/useEligibility';
import { useCreateHrAdvance } from '../../hooks/useCreateAdvance';
import type { AdvanceType, DisbursementMode, HrAdvanceFormInput } from '../../types/salaryAdvance.model';
import { buildSchedule } from '../../utils/schedule';
import { money, parseAmount, thisMonth } from '../../utils/format';
import { validateHrAdvance } from '../../utils/validators';
import { EligibilityPanel } from './EligibilityPanel';
import { InstallmentStepper } from './InstallmentStepper';
import { SchedulePreviewTable } from './SchedulePreviewTable';
import { MergeChooser } from './RepaymentPlanFields';

interface NewAdvanceDrawerProps {
  open: boolean;
  types: AdvanceType[];
  canSkipApproval: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}

const MAX_WITHOUT_POLICY = 60;

export function NewAdvanceDrawer({ open, types, canSkipApproval, onClose, onCreated }: NewAdvanceDrawerProps) {
  const [employees, setEmployees] = React.useState<CompEmployeeDto[]>([]);
  const [typeId, setTypeId] = React.useState<number | null>(null);
  const [amount, setAmount] = React.useState('');
  const [installments, setInstallments] = React.useState(1);
  const [reason, setReason] = React.useState('');
  const [mode, setMode] = React.useState<DisbursementMode | null>(null);
  const [skipApproval, setSkipApproval] = React.useState(false);
  const [startMonth, setStartMonth] = React.useState('');
  const [merge, setMerge] = React.useState<number[]>([]);

  const mutation = useCreateHrAdvance(onCreated);
  const { clear } = mutation;
  const employeeId = employees[0]?.id ?? null;
  const eligibility = useEligibility(open ? employeeId : null, open ? typeId : null);
  const e = eligibility.eligibility;

  React.useEffect(() => {
    if (!open) return;
    setEmployees([]);
    setTypeId(types.length === 1 ? types[0].id : null);
    setAmount('');
    setInstallments(1);
    setReason('');
    setMode(null);
    setSkipApproval(false);
    setStartMonth('');
    setMerge([]);
    clear();
  }, [open, types, clear]);

  React.useEffect(() => {
    setMerge([]);
  }, [employeeId]);

  const fe = mutation.fieldErrors;
  const clearField = (key: keyof typeof fe) => {
    if (fe[key]) mutation.setFieldErrors({ ...fe, [key]: undefined });
  };

  const amountValue = Number(amount);
  const maxInstallments = e?.maxInstallments ?? MAX_WITHOUT_POLICY;
  const preview = React.useMemo(() => {
    if (!e || !Number.isFinite(amountValue) || amountValue <= 0) return null;
    const carried = (e.mergeable || []).filter((m) => merge.includes(m.id)).reduce((s, m) => s + m.outstanding, 0);
    return buildSchedule({
      amount: amountValue + carried,
      installments,
      startMonth: startMonth || addMonths(thisMonth(), 1),
      interestMode: e.interestMode,
      annualRate: e.interestRate,
    });
  }, [e, amountValue, installments, startMonth, merge]);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const input: HrAdvanceFormInput = { employeeId, typeId, amount: amountValue, installments, reason, disbursementMode: mode, skipApproval, startMonth: startMonth || null, mergeAdvanceIds: merge };
    const errors = validateHrAdvance(input, e);
    if (Object.keys(errors).length) {
      mutation.setFieldErrors(errors);
      return;
    }
    mutation.create(input);
  };

  const policyMode = e?.disbursementMode ?? 'manual';

  return (
    <Drawer open={open} onClose={onClose} title="New advance" maxWidthClassName="sm:max-w-xl">
      <form onSubmit={submit} noValidate className="flex min-h-full flex-col gap-4">
        <EmployeePicker
          label="Employee"
          value={employees}
          onChange={(v) => {
            setEmployees(v.slice(-1));
            clearField('employee_id');
          }}
          error={fe.employee_id}
        />

        <SelectField<number>
          label="Advance type"
          required
          numeric
          value={typeId}
          onChange={(v) => {
            setTypeId(v);
            clearField('advance_type_id');
          }}
          options={types.map((t) => ({ value: t.id, label: t.name }))}
          placeholder={types.length ? 'Select a type…' : 'No active advance types'}
          error={fe.advance_type_id}
        />

        {employeeId && typeId && <EligibilityPanel eligibility={e} loading={eligibility.isLoading} error={eligibility.error} audience="hr" />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <TextField
            label="Amount"
            required
            inputMode="decimal"
            prefix="₹"
            value={amount}
            onChange={(v) => {
              setAmount(parseAmount(v));
              clearField('amount');
            }}
            placeholder="0"
            error={fe.amount}
            hint={e?.maxAmount !== null && e?.maxAmount !== undefined ? `Up to ${money(e.maxAmount)}` : undefined}
          />
          <InstallmentStepper
            value={installments}
            onChange={(n) => {
              setInstallments(n);
              clearField('installments');
            }}
            max={maxInstallments}
            error={fe.installments}
            hint="1 for recovery in one go"
          />
        </div>

        <TextField
          label="First deduction month"
          type="month"
          min={thisMonth()}
          value={startMonth}
          onChange={(v) => {
            setStartMonth(v);
            clearField('start_month');
          }}
          error={fe.start_month}
          hint={startMonth ? undefined : 'Empty: the payroll after it is paid out. Pick this month to recover it from this month’s salary.'}
        />

        {e && e.mergeable.length > 0 && (
          <MergeChooser
            items={e.mergeable}
            selected={new Set(merge)}
            onToggle={(id) => setMerge((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))}
            error={fe.merge_advance_ids}
          />
        )}

        <SchedulePreviewTable preview={preview} loading={false} note={merge.length ? 'Includes what is left on the merged advances. The real schedule starts from the payout.' : 'Months assume it is paid out this month. The real schedule starts from the payout.'} />

        <Textarea
          label="Reason"
          required
          value={reason}
          onChange={(ev) => {
            setReason(ev.target.value);
            clearField('reason');
          }}
          maxLength={1000}
          rows={3}
          placeholder="For example, medical emergency"
          error={fe.reason}
        />

        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">How it is paid out</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <OptionCard selected={mode === null} onClick={() => setMode(null)} title="Policy default" description={policyMode === 'payroll' ? 'With payroll' : 'By Accounts'} />
            <OptionCard selected={mode === 'manual'} onClick={() => setMode('manual')} title="By Accounts" description="Bank transfer, recorded here" />
            <OptionCard selected={mode === 'payroll'} onClick={() => setMode('payroll')} title="With payroll" description="Added as an earning" />
          </div>
        </div>

        {canSkipApproval && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-fg sm:text-sm">Approve now</p>
              <p className="text-[11px] text-fg-muted sm:text-xs">Skip the approval flow. The advance is ready to pay out straight away.</p>
            </div>
            <Switch checked={skipApproval} onChange={setSkipApproval} label="Approve now" />
          </div>
        )}

        {mutation.formError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{mutation.formError}</p>}

        <div className="mt-auto flex justify-end gap-2.5 border-t border-line pt-4">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn type="submit" variant="primary" busy={mutation.isSaving} disabled={Boolean(e && !e.eligible)}>
            Create advance
          </Btn>
        </div>
      </form>
    </Drawer>
  );
}
