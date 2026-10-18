'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { EmployeePicker } from '@/features/compensation/components/shared/EmployeePicker';
import type { CompEmployeeDto } from '@/features/compensation/types/compensation.dto';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/insurance.api';
import { useDebounced } from '../../hooks/useDebounced';
import type { EnrollResult, Member, Plan, Preview } from '../../types/insurance.types';
import { formErrors } from '../../utils/errors';
import { FamilyEditor } from './FamilyEditor';
import { PremiumSummary } from './PremiumSummary';

interface EnrollDrawerProps {
  open: boolean;
  plans: Plan[];
  initialPlanId: number | null;
  onClose: () => void;
  onDone: () => void;
}

/** Only rows that are filled in are sent to the preview, so half-typed family members never raise errors. */
const ready = (m: Member) => m.name.trim() && (m.role === 'nominee' ? Number(m.nominee_share) > 0 : Boolean(m.dob));

export function EnrollDrawer({ open, plans, initialPlanId, onClose, onDone }: EnrollDrawerProps) {
  const [planId, setPlanId] = React.useState<number | null>(null);
  const [employees, setEmployees] = React.useState<CompEmployeeDto[]>([]);
  const [startDate, setStartDate] = React.useState('');
  const [memberNo, setMemberNo] = React.useState('');
  const [members, setMembers] = React.useState<Member[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [result, setResult] = React.useState<EnrollResult | null>(null);
  const request = React.useRef(0);

  const plan = plans.find((p) => p.id === planId) ?? null;
  const single = employees.length === 1;

  React.useEffect(() => {
    if (!open) return;
    setPlanId(initialPlanId);
    setEmployees([]);
    setStartDate('');
    setMemberNo('');
    setMembers([]);
    setErrors({});
    setFormError('');
    setPreview(null);
    setResult(null);
  }, [open, initialPlanId]);

  const previewKey = useDebounced(JSON.stringify([planId, startDate, single ? members.filter(ready) : []]), 350);
  React.useEffect(() => {
    if (!open || !planId) {
      setPreview(null);
      return;
    }
    const [id, start, family] = JSON.parse(previewKey) as [number, string, Member[]];
    const run = ++request.current;
    api.previewEnrollment({ plan_id: id, start_date: start || undefined, members: family })
      .then((p) => run === request.current && setPreview(p))
      .catch(() => run === request.current && setPreview(null));
  }, [open, planId, previewKey]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErrors({});
    setFormError('');
    if (!planId) return setErrors({ plan_id: 'Choose a plan' });
    if (!employees.length) return setErrors({ employee_ids: 'Choose at least one employee' });
    setSaving(true);
    try {
      const res = await api.createEnrollments({
        plan_id: planId,
        employee_ids: employees.map((e) => e.id),
        start_date: startDate || undefined,
        ...(single ? { member_no: memberNo || undefined, members } : {}),
      });
      showSuccess(`${res.created} ${res.created === 1 ? 'employee' : 'employees'} covered`);
      if (res.skipped.length) setResult(res);
      else onDone();
    } catch (err) {
      const { fields, form } = formErrors(err);
      setErrors(fields);
      setFormError(form);
    } finally {
      setSaving(false);
    }
  };

  const nameOf = (id: number) => employees.find((e) => e.id === id)?.name ?? `Employee ${id}`;

  return (
    <Drawer open={open} onClose={result ? onDone : onClose} title="Cover employees" maxWidthClassName="sm:max-w-2xl">
      {result ? (
        <div className="flex min-h-full flex-col gap-4">
          <p className="text-sm font-semibold text-fg">{result.created} covered, {result.skipped.length} left out</p>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {result.skipped.map((s) => (
              <li key={s.employee_id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <span className="font-medium text-fg">{nameOf(s.employee_id)}</span>
                <span className="text-fg-muted">{s.reason}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex justify-end border-t border-line pt-4"><Btn variant="primary" onClick={onDone}>Done</Btn></div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex min-h-full flex-col gap-4">
          <SelectField<number>
            label="Plan"
            required
            numeric
            value={planId}
            onChange={(v) => { setPlanId(v); setErrors((e) => ({ ...e, plan_id: '' })); }}
            options={plans.map((p) => ({ value: p.id, label: p.name }))}
            placeholder={plans.length ? 'Select a plan…' : 'No active plans'}
            error={errors.plan_id}
          />

          <EmployeePicker
            multiple
            label="Employees"
            value={employees}
            onChange={(v) => { setEmployees(v); setErrors((e) => ({ ...e, employee_ids: '' })); }}
            error={errors.employee_ids}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Cover starts"
              type="date"
              min={plan?.start_date}
              max={plan?.end_date}
              value={startDate}
              onChange={setStartDate}
              error={errors.start_date}
              hint={plan ? 'Empty: today, or the plan start if it is later.' : undefined}
            />
            {single && <TextField label="Member number" value={memberNo} onChange={setMemberNo} hint="From the insurer’s card" />}
          </div>

          {plan && single && <FamilyEditor covers={plan.covers} members={members} onChange={setMembers} errors={errors} />}
          {plan && employees.length > 1 && <p className="text-xs text-fg-muted">Add family and nominees to each employee afterwards.</p>}

          {preview && (
            <PremiumSummary
              annual={preview.annual_premium}
              employer={preview.employer_share}
              employee={preview.employee_share}
              recovery={preview.recovery}
              schedule={preview.schedule}
              note={employees.length > 1 ? 'Per employee, covering the employee only.' : preview.annual_premium !== preview.full_premium ? 'Reduced for the part of the year left.' : undefined}
            />
          )}

          {formError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{formError}</p>}

          <div className="mt-auto flex justify-end gap-2.5 border-t border-line pt-4">
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn type="submit" variant="primary" busy={saving}>Cover {employees.length > 1 ? `${employees.length} employees` : 'employee'}</Btn>
          </div>
        </form>
      )}
    </Drawer>
  );
}
