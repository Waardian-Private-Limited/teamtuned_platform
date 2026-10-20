'use client';

import React from 'react';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { FieldLabel, FieldMessage, OptionCard, Section, SelectField, TextField } from '@/components/ui/FormControls';
import { ManagerPicker } from './ManagerPicker';
import { SitePicker } from './SitePicker';
import type { EmployeeFormController } from './types';
import { contractEndFor, contractMonthsFor } from '../../utils/contract';
import { daysBetween } from '@/lib/datetime';

function confirmationDate(joining: string, months: string) {
  const m = Number(months);
  if (!joining || !months.trim() || !Number.isInteger(m) || m <= 0) return null;
  const d = new Date(`${joining}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + m);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function StepJob({ c, employeeId }: { c: EmployeeFormController; employeeId: number | null }) {
  const { form, set, errors, options } = c;
  const { subOrgs } = useManageableSubOrgs();

  const roles = React.useMemo(
    () => (options?.roles || []).filter((r) => !r.department_id || r.department_id === form.departmentId),
    [options, form.departmentId]
  );

  const setDepartment = (id: number | null) => {
    set('departmentId', id);
    const role = options?.roles.find((r) => r.id === form.roleId);
    if (role?.department_id && role.department_id !== id) set('roleId', null);
  };

  const setEmploymentType = (id: number | null) => {
    set('employmentTypeId', id);
    const type = options?.employment_types.find((t) => t.id === id);
    if (!type) return;
    if (type.is_fixed_term && type.default_contract_months !== null && !form.contractMonths.trim() && !form.contractEnd) {
      set('contractBy', 'months');
      set('contractMonths', String(type.default_contract_months));
    }
    if (!form.probationMonths.trim() && type.default_probation_months !== null) set('probationMonths', String(type.default_probation_months));
    if (!form.noticePeriodDays.trim() && type.default_notice_days !== null) set('noticePeriodDays', String(type.default_notice_days));
  };

  const confirmation = confirmationDate(form.joiningDate, form.probationMonths);

  // Months and end date describe the same term: the one the user typed wins, the other is worked out.
  const contractStart = form.contractStart || form.joiningDate;
  const byMonths = form.contractBy === 'months';
  const derivedEnd = byMonths ? contractEndFor(contractStart, Number(form.contractMonths)) : null;
  const derivedMonths = !byMonths ? contractMonthsFor(contractStart, form.contractEnd) : null;
  const termDays = !byMonths && contractStart && form.contractEnd > contractStart ? daysBetween(contractStart, form.contractEnd) + 1 : null;
  const setContract = (by: 'months' | 'end', value: string) => {
    set('contractBy', by);
    set(by === 'months' ? 'contractMonths' : 'contractEnd', value);
  };

  return (
    <div className="space-y-4">
      <Section title="Organization" description="Lists below show only what belongs to the selected sub-organization">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {subOrgs.length > 0 && (
            <SelectField<number>
              label="Sub-organization"
              required
              numeric
              value={form.subOrganizationId}
              onChange={(v) => set('subOrganizationId', v)}
              options={subOrgs.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              disabled={subOrgs.length === 1}
              error={errors.sub_organization_id}
            />
          )}
          <SelectField<number>
            label="Department"
            required
            numeric
            value={form.departmentId}
            onChange={setDepartment}
            options={(options?.departments || []).map((d) => ({ value: d.id, label: d.name }))}
            error={errors.department_id}
          />
          <SelectField<number>
            label="Role"
            required
            numeric
            value={form.roleId}
            onChange={(v) => set('roleId', v)}
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
            placeholder={form.departmentId ? 'Select…' : 'Select department first'}
            disabled={!form.departmentId}
            error={errors.role_id}
          />
          <TextField label="Designation" value={form.designation} onChange={(v) => set('designation', v)} error={errors.designation} placeholder="e.g., Senior Accountant" maxLength={255} />
          <div className="sm:col-span-2">
            <ManagerPicker
              value={form.reportingManager}
              onChange={(m) => set('reportingManager', m)}
              subOrgId={form.subOrganizationId}
              excludeId={employeeId}
              error={errors.reporting_manager_id}
            />
          </div>
        </div>
      </Section>

      <Section title="Employment" description="Confirmation date is worked out from probation">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField<number>
            label="Employment type"
            required
            numeric
            value={form.employmentTypeId}
            onChange={setEmploymentType}
            options={(options?.employment_types || []).map((t) => ({ value: t.id, label: t.name }))}
            error={errors.employment_type_id}
            hint={(options?.employment_types || []).length ? undefined : 'Add employment types in Employee settings'}
          />
          <TextField label="Joining date" required type="date" value={form.joiningDate} onChange={(v) => set('joiningDate', v)} error={errors.employment_start_date} />
          <TextField
            label="Probation (months)"
            type="number"
            min={0}
            max={24}
            value={form.probationMonths}
            onChange={(v) => set('probationMonths', v)}
            error={errors.probation_months}
            hint={confirmation ? `Confirmation on ${confirmation}` : 'Leave empty if no probation'}
          />
          <TextField label="Notice period (days)" type="number" min={0} max={365} value={form.noticePeriodDays} onChange={(v) => set('noticePeriodDays', v)} error={errors.notice_period_days} />
        </div>
        {c.fixedTerm && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-3">
            <TextField label="Contract start" required type="date" value={contractStart} onChange={(v) => set('contractStart', v)} error={errors.contract_start} hint="Same as joining date unless changed" />
            <TextField
              label="Contract length (months)"
              type="number"
              min={1}
              max={120}
              value={byMonths ? form.contractMonths : derivedMonths !== null ? String(derivedMonths) : ''}
              onChange={(v) => setContract('months', v)}
              error={errors.contract_months}
              hint={!byMonths && termDays !== null && derivedMonths === null ? `${termDays} days from the end date` : 'Or enter the end date'}
            />
            <TextField
              label="Contract end"
              type="date"
              value={byMonths ? derivedEnd || '' : form.contractEnd}
              onChange={(v) => setContract('end', v)}
              error={errors.contract_end}
              hint={byMonths && derivedEnd ? 'Worked out from the length' : 'Or enter the length'}
            />
          </div>
        )}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField<number>
            label="Grade / band"
            numeric
            value={form.gradeId}
            onChange={(v) => set('gradeId', v)}
            options={(options?.grades || []).map((g) => ({ value: g.id, label: g.name }))}
            placeholder="None"
            error={errors.grade_id}
            hint={(options?.grades || []).length ? undefined : 'Add grades in Grades / bands'}
          />
          <SelectField<number>
            label="Cost centre"
            numeric
            value={form.costCentreId}
            onChange={(v) => set('costCentreId', v)}
            options={(options?.cost_centres || []).map((g) => ({ value: g.id, label: g.name }))}
            placeholder="None"
            error={errors.cost_centre_id}
            hint={(options?.cost_centres || []).length ? undefined : 'Add cost centres in Cost centres'}
          />
        </div>
      </Section>

      <Section title="Work location">
        <SitePicker
          sites={options?.sites || []}
          siteIds={form.siteIds}
          primarySiteId={form.primarySiteId}
          onChange={(ids, primary) => {
            set('siteIds', ids);
            set('primarySiteId', primary);
          }}
          error={errors.primary_site_id || errors.site_ids}
        />
        <div className="mt-5 sm:max-w-sm">
          <SelectField<string>
            label="Work state"
            value={form.workState || null}
            onChange={(v) => set('workState', v || '')}
            options={(options?.states || []).map((st) => ({ value: st, label: st }))}
            placeholder={c.siteState ? `Primary site's state (${c.siteState})` : "Primary site's state"}
            error={errors.work_state}
            hint="Decides professional tax and labour welfare fund. Leave empty to use the primary site's state."
          />
        </div>
        <div className="mt-5">
          <FieldLabel label="Attendance location access" />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {(options?.location_access || []).map((o) => (
              <OptionCard key={o.value} selected={form.locationAccess === o.value} onClick={() => set('locationAccess', o.value)} title={o.label} description={o.description} />
            ))}
          </div>
          <FieldMessage error={errors.location_access} />
        </div>
      </Section>
    </div>
  );
}
