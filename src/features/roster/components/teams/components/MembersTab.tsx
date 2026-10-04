'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useTeamMemberPreview } from '../../../hooks/useTeamMemberPreview';
import { useTeamMembersDraft } from '../../../hooks/useTeamMembersDraft';
import type { UnitFilters } from '../../../types/roster.types';
import { EmployeePicker } from '../../catalog-shared/EmployeePicker';
import { MultiSelectField } from '../../catalog-shared/MultiSelectField';
import { personName } from '../../catalog-shared/catalogUi';
import type { TeamDetailTabProps } from './TeamTabProps';
import { MemberPreview } from './MemberPreview';
import { MemberScheduleList } from './MemberScheduleList';
import { TabFooter } from './TabFooter';

const sameFilters = (a: UnitFilters, b: UnitFilters) => JSON.stringify(a) === JSON.stringify(b);

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-2">
      <h4 className="text-sm font-bold text-fg">{title}</h4>
      <p className="text-[11px] text-fg-muted">{hint}</p>
    </div>
  );
}

export function MembersTab({ editor, detail, catalog }: TeamDetailTabProps) {
  const [filters, setFilters] = React.useState<UnitFilters>({
    siteIds: detail.filters.siteIds ?? [],
    departmentIds: detail.filters.departmentIds ?? [],
    roleIds: detail.filters.roleIds ?? [],
    employmentTypeIds: detail.filters.employmentTypeIds ?? [],
  });
  const draft = useTeamMembersDraft(detail.members, catalog.patterns);
  const [tick, setTick] = React.useState(1);
  const subOrg = detail.sub_organization_id;

  const unchanged = sameFilters(filters, detail.filters);
  const preview = useTeamMemberPreview(detail.id, filters, subOrg, detail.parent_unit_id, unchanged ? String(tick) : null);

  const included = draft.rows.filter((r) => r.mode === 'include');
  const excluded = draft.rows.filter((r) => r.mode === 'exclude');
  const chosenIds = new Set(included.map((r) => r.employeeId));
  const set = (key: keyof UnitFilters) => (v: number[]) => setFilters((f) => ({ ...f, [key]: v }));

  const save = async () => {
    if (await editor.saveMemberList(filters, draft.toInput())) setTick((t) => t + 1);
  };

  const people = (list: { id: number; first_name: string; last_name: string; employee_code: string | null }[]) =>
    list.map((e) => ({ id: e.id, name: personName(e), code: e.employee_code }));

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle title="Who is in this team" hint="Within one filter, any match counts. Across filters, a person must match all of them. Leave a filter empty to ignore it." />
        <div className="grid gap-3 sm:grid-cols-2">
          <MultiSelectField label="Sites" options={catalog.sites} value={filters.siteIds} onChange={set('siteIds')} placeholder="Any site" />
          <MultiSelectField label="Departments" options={catalog.departments} value={filters.departmentIds} onChange={set('departmentIds')} placeholder="Any department" />
          <MultiSelectField label="Roles" options={catalog.roles} value={filters.roleIds} onChange={set('roleIds')} placeholder="Any role" />
          <MultiSelectField label="Employment types" options={catalog.employmentTypes} value={filters.employmentTypeIds} onChange={set('employmentTypeIds')} placeholder="Any type" />
        </div>
        <p className="mt-2 text-[11px] text-fg-muted">People in sub-teams are included automatically. {subOrg ? 'Only employees of this team’s sub-organization can be members.' : ''}</p>
      </section>

      <MemberPreview
        total={preview.total}
        employees={preview.employees}
        loading={preview.loading}
        error={preview.error}
        chosenIds={chosenIds}
        fromSaved={unchanged}
        onAddAll={() => draft.add(preview.employees.map((e) => ({ id: e.id, name: e.name, code: e.employee_code })), 'include')}
      />

      <section>
        <SectionTitle title="People chosen by hand" hint="Always in the team, even if they do not match the filters. Give each person a rotation or a fixed shift if they do not simply follow demand." />
        <EmployeePicker subOrgId={subOrg} excludeIds={[...chosenIds]} onPick={(e) => draft.add(people([e]), 'include')} placeholder="Add a person by name or code…" />
        <div className="mt-3">
          <MemberScheduleList
            rows={included}
            patterns={catalog.patterns}
            shifts={catalog.shifts}
            onRemove={draft.remove}
            onSchedule={draft.setSchedule}
            onOffset={(id, offset) => draft.patch([id], { offset })}
            onStagger={draft.stagger}
          />
        </div>
      </section>

      <section>
        <SectionTitle title="People left out" hint="Never in the team, even if they match the filters." />
        <EmployeePicker subOrgId={subOrg} excludeIds={excluded.map((r) => r.employeeId)} onPick={(e) => draft.add(people([e]), 'exclude')} placeholder="Leave out a person…" />
        {excluded.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {excluded.map((r) => (
              <span key={r.employeeId} className="inline-flex items-center gap-1 rounded-md border border-line bg-bg-subtle px-2 py-1 text-xs font-medium text-fg">
                {r.name}
                <button type="button" aria-label={`Stop leaving out ${r.name}`} onClick={() => draft.remove(r.employeeId)} className="text-fg-muted hover:text-fg"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
      </section>

      <TabFooter label="Save members" saving={editor.saving === 'members'} error={editor.errors.members?.message} onSave={save} />
    </div>
  );
}
