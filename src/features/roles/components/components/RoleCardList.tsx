'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { cx, text } from '@/theme/tokens';
import type { Role } from '../../types/roles.model';
import { RoleRowActions } from './RoleRowActions';

interface RoleCardListProps {
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

export function RoleCardList({
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
}: RoleCardListProps) {
  return (
    <>
      {roles.map((role) => (
        <div key={role.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="truncate text-sm font-medium text-fg">{role.name}</span>
              {role.description && <div className={cx(text.caption, 'mt-0.5 truncate')}>{role.description}</div>}
            </div>
            <StatusPill label={role.status} tone={role.status} />
          </div>

          <div className="mt-2 flex items-center gap-3 text-sm text-fg-muted">
            {role.departmentName && <span>{role.departmentName}</span>}
            <button type="button" onClick={() => onView(role)} className="hover:text-fg hover:underline">
              {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}
            </button>
            <button type="button" onClick={() => onOpenEmployees(role)} className="hover:text-fg hover:underline">
              {role.employeeCount} employee{role.employeeCount === 1 ? '' : 's'}
            </button>
          </div>

          <div className="mt-3 flex justify-end">
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
          </div>
        </div>
      ))}
    </>
  );
}
