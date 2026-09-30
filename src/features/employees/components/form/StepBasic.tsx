'use client';

import { GENDERS } from '../../constants/employees.constants';
import type { Gender } from '../../types/employees.dto';
import { Section, SelectField, TextField } from '@/components/ui/FormControls';
import type { EmployeeFormController } from './types';

export function StepBasic({ c }: { c: EmployeeFormController }) {
  const { form, set, errors, options } = c;
  const editable = options?.code_editable !== false;
  return (
    <div className="space-y-4">
      <Section title="Personal details" description="Name as it should appear on payslips and letters">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField label="First name" required value={form.firstName} onChange={(v) => set('firstName', v)} error={errors.first_name} autoFocus maxLength={100} />
          <TextField label="Middle name" value={form.middleName} onChange={(v) => set('middleName', v)} error={errors.middle_name} maxLength={100} />
          <TextField label="Last name" required value={form.lastName} onChange={(v) => set('lastName', v)} error={errors.last_name} maxLength={100} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField<Gender>
            label="Gender"
            value={form.gender || null}
            onChange={(v) => set('gender', v || '')}
            options={GENDERS.map((g) => ({ value: g, label: g }))}
            error={errors.gender}
          />
          <TextField label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} error={errors.date_of_birth} max={form.joiningDate || undefined} />
          <TextField
            label="Employee code"
            value={form.employeeCode}
            onChange={(v) => {
              set('employeeCode', v);
              set('codeTouched', true);
            }}
            disabled={!editable}
            error={errors.employee_code}
            hint={editable ? 'Auto-generated from your code format. You can change it.' : 'Auto-generated from your code format'}
            maxLength={40}
          />
        </div>
      </Section>

      <Section title="Contact" description="Email or phone is required. It becomes the employee's login.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Email" type="email" inputMode="email" autoComplete="off" value={form.email} onChange={(v) => set('email', v)} error={errors.email} placeholder="name@company.com" maxLength={150} />
          <TextField label="Mobile" type="tel" inputMode="numeric" autoComplete="off" prefix="+91" value={form.phone} onChange={(v) => set('phone', v.replace(/[^\d\s+]/g, ''))} error={errors.phone} placeholder="98765 43210" maxLength={15} />
        </div>
      </Section>
    </div>
  );
}
