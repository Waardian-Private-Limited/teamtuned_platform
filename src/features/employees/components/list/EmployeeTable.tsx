'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { cx } from '@/theme/tokens';
import { STATUS_TONE } from '../../constants/employees.constants';
import type { EmployeeListItemDto } from '../../types/employees.dto';
import type { StatusAction } from '../../hooks/useEmployeeStatus';
import { EmployeeIdentity } from './EmployeeIdentity';
import { EmployeeRowActions } from './EmployeeRowActions';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';

interface EmployeeTableProps {
  employees: EmployeeListItemDto[];
  canEdit: boolean;
  canDelete: boolean;
  busyId: number | null;
  onEdit: (employee: EmployeeListItemDto) => void;
  onAction: (employee: EmployeeListItemDto, action: StatusAction) => void;
  onHistory?: (employee: EmployeeListItemDto) => void;
}

const th = 'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4 align-middle';
const sub = 'truncate text-[11px] text-fg-muted 2xl:text-xs';
const main = 'truncate text-xs text-fg sm:text-sm 2xl:text-base';

export function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function EmployeeTable({ employees, canEdit, canDelete, busyId, onEdit, onAction, onHistory }: EmployeeTableProps) {
  const { subOrgs } = useManageableSubOrgs();
  const hasSubOrgs = subOrgs.length > 0;

  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[860px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(th, 'first:rounded-tl-xl')}>Employee</th>
            <th className={cx(th, 'w-56 2xl:w-72')}>Contact</th>
            <th className={cx(th, 'w-48 2xl:w-60')}>Department</th>
            {hasSubOrgs && <th className={cx(th, 'w-36 2xl:w-44')}>Sub-org</th>}
            <th className={cx(th, 'hidden w-40 xl:table-cell 2xl:w-52')}>Site</th>
            <th className={cx(th, 'w-32')}>Status</th>
            <th className={cx(th, 'w-32 text-right last:rounded-tr-xl')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className={td}>
                <EmployeeIdentity employee={e} />
              </td>
              <td className={td}>
                <div className={cx(main, 'max-w-[13rem] 2xl:max-w-[17rem]')}>{e.email || '—'}</div>
                <div className={sub}>{e.phone ? `+91 ${e.phone}` : ''}</div>
              </td>
              <td className={td}>
                <div className={cx(main, 'max-w-[11rem] 2xl:max-w-[14rem]')}>{e.department_name || '—'}</div>
                <div className={sub}>{e.role_name || ''}</div>
              </td>
              {hasSubOrgs && (
                <td className={td}>
                  {e.sub_organization_id ? (
                    <SubOrgBadge subOrgId={e.sub_organization_id} hideEmpty />
                  ) : (
                    <span className="text-xs text-fg-muted">—</span>
                  )}
                </td>
              )}
              <td className={cx(td, 'hidden xl:table-cell')}>
                <div className={cx(main, 'max-w-[9rem] 2xl:max-w-[12rem]')}>{e.primary_site_name || '—'}</div>
                <div className={sub}>{e.work_type || ''}</div>
              </td>
              <td className={td}>
                <StatusPill label={e.status} tone={STATUS_TONE[e.status]} />
              </td>
              <td className={td}>
                <EmployeeRowActions employee={e} canEdit={canEdit} canDelete={canDelete} busy={busyId === e.id} onEdit={onEdit} onAction={onAction} onHistory={onHistory} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
