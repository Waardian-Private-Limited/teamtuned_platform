'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { STATUS_TONE } from '../../constants/employees.constants';
import type { EmployeeListItemDto } from '../../types/employees.dto';
import type { StatusAction } from '../../hooks/useEmployeeStatus';
import { EmployeeIdentity } from './EmployeeIdentity';
import { EmployeeRowActions } from './EmployeeRowActions';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import { formatDate } from './EmployeeTable';

interface EmployeeCardListProps {
  employees: EmployeeListItemDto[];
  canEdit: boolean;
  canDelete: boolean;
  busyId: number | null;
  onEdit: (employee: EmployeeListItemDto) => void;
  onAction: (employee: EmployeeListItemDto, action: StatusAction) => void;
  onHistory?: (employee: EmployeeListItemDto) => void;
}

export function EmployeeCardList({ employees, canEdit, canDelete, busyId, onEdit, onAction, onHistory }: EmployeeCardListProps) {
  return (
    <>
      {employees.map((e) => (
        <div key={e.id} className="p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <EmployeeIdentity employee={e} />
            <StatusPill label={e.status} tone={STATUS_TONE[e.status]} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
            <div className="min-w-0">
              <dt className="text-fg-subtle">Department</dt>
              <dd className="truncate font-medium text-fg">{[e.department_name, e.role_name].filter(Boolean).join(' · ') || '—'}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-fg-subtle">Site</dt>
              <dd className="truncate font-medium text-fg">{e.primary_site_name || '—'}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-fg-subtle">Contact</dt>
              <dd className="truncate font-medium text-fg">{e.email || (e.phone ? `+91 ${e.phone}` : '—')}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-fg-subtle">Joined</dt>
              <dd className="truncate font-medium text-fg">{formatDate(e.joining_date)}</dd>
            </div>
            {e.sub_organization_id ? (
              <div className="min-w-0 col-span-2">
                <dt className="text-fg-subtle">Sub-organization</dt>
                <dd className="mt-0.5"><SubOrgBadge subOrgId={e.sub_organization_id} hideEmpty /></dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-2.5 border-t border-line/60 pt-2">
            <EmployeeRowActions employee={e} canEdit={canEdit} canDelete={canDelete} busy={busyId === e.id} onEdit={onEdit} onAction={onAction} onHistory={onHistory} />
          </div>
        </div>
      ))}
    </>
  );
}
