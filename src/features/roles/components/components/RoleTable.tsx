'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { cx, text } from '@/theme/tokens';
import type { Role } from '../../types/roles.model';
import { RoleRowActions } from './RoleRowActions';

interface RoleTableProps {
  roles: Role[];
  canEdit: boolean;
  canAdd: boolean;
  canDelete: boolean;
  onView: (role: Role) => void;
  onEdit: (role: Role) => void;
  onClone: (role: Role) => void;
  onDelete: (role: Role) => void;
  onToggleStatus: (role: Role) => void;
  onOpenEmployees: (role: Role) => void;
  togglingId?: number | null;
}

const cellHeaderClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';

export function RoleTable({
  roles,
  canEdit,
  canAdd,
  canDelete,
  onView,
  onEdit,
  onClone,
  onDelete,
  onToggleStatus,
  onOpenEmployees,
  togglingId,
}: RoleTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[620px] md:min-w-0 border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(cellHeaderClass, 'first:rounded-tl-xl')}>Role</th>
            <th className={cx(cellHeaderClass, 'w-32 sm:w-36 lg:w-40 2xl:w-48')}>Department</th>
            <th className={cx(cellHeaderClass, 'w-24 sm:w-28 lg:w-32 2xl:w-36')}>Permissions</th>
            <th className={cx(cellHeaderClass, 'w-20 sm:w-24 lg:w-28 2xl:w-32')}>Employees</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-44')}>Status</th>
            <th className={cx(cellHeaderClass, 'w-36 sm:w-40 lg:w-44 2xl:w-52 text-right last:rounded-tr-xl')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <span className="text-xs sm:text-sm 2xl:text-base font-semibold text-fg">{role.name}</span>
                {role.description && (
                  <div className={cx(text.caption, 'mt-0.5 max-w-xs truncate sm:max-w-sm lg:max-w-md 2xl:max-w-xl 2xl:text-sm')}>
                    {role.description}
                  </div>
                )}
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <span className="text-xs sm:text-sm 2xl:text-base text-fg-muted">{role.departmentName ?? '—'}</span>
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <button type="button" onClick={() => onView(role)} className="text-xs sm:text-sm 2xl:text-base font-medium text-fg hover:text-[var(--tt-primary)] hover:underline">
                  {role.permissions.length}
                </button>
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <button type="button" onClick={() => onOpenEmployees(role)} className="text-xs sm:text-sm 2xl:text-base font-medium text-fg hover:text-[var(--tt-primary)] hover:underline">
                  {role.employeeCount}
                </button>
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <StatusPill label={role.status} tone={role.status} />
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <RoleRowActions
                  role={role}
                  canEdit={canEdit}
                  canAdd={canAdd}
                  canDelete={canDelete}
                  onView={onView}
                  onEdit={onEdit}
                  onClone={onClone}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                  onOpenEmployees={onOpenEmployees}
                  isToggling={togglingId === role.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
