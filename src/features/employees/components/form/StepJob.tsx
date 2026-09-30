'use client';

import React from 'react';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { FieldLabel, FieldMessage, OptionCard, Section, SelectField, TextField } from '@/components/ui/FormControls';
import { ManagerPicker } from './ManagerPicker';
import { SitePicker } from './SitePicker';
import type { EmployeeFormController } from './types';

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
    if (!form.probationMonths.trim() && type.default_probation_months !== null) set('probationMonths', String(type.default_probation_months));
    if (!form.noticePeriodDays.trim() && type.default_notice_days !== null) set('noticePeriodDays', String(type.default_notice_days));
  };

  const confirmation = confirmationDate(form.joiningDate, form.probationMonths);

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
