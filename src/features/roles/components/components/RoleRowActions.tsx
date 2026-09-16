'use client';

import { Eye, Power, SquarePen, Copy, Trash2, Users } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Role } from '../../types/roles.model';

interface RoleRowActionsProps {
  role: Role;
  canEdit: boolean;
  canAdd: boolean;
  canDelete: boolean;
  onView: (role: Role) => void;
  onEdit: (role: Role) => void;
  onClone: (role: Role) => void;
  onDelete: (role: Role) => void;
  onToggleStatus: (role: Role) => void;
  onOpenEmployees: (role: Role) => void;
  isToggling?: boolean;
}

const iconButtonClass =
  'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

export function RoleRowActions({
  role,
  canEdit,
  canAdd,
  canDelete,
  onView,
  onEdit,
  onClone,
  onDelete,
  onToggleStatus,
  onOpenEmployees,
  isToggling = false,
}: RoleRowActionsProps) {
  const isCurrentlyActive = role.status === 'active';

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip content="View effective permissions">
        <button type="button" onClick={() => onView(role)} aria-label="View role" className={iconButtonClass}>
          <Eye className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
        </button>
      </Tooltip>

      <Tooltip content="Assign employees">
        <button type="button" onClick={() => onOpenEmployees(role)} aria-label="Manage employees" className={iconButtonClass}>
          <Users className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
        </button>
      </Tooltip>

      {canEdit && (
        <>
          <Tooltip content="Edit Role">
            <button type="button" onClick={() => onEdit(role)} aria-label="Edit role" className={iconButtonClass}>
              <SquarePen className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
            </button>
          </Tooltip>

          <Tooltip content={isCurrentlyActive ? 'Deactivate' : 'Activate'} align="end">
            <button
              type="button"
              disabled={isToggling}
              onClick={() => onToggleStatus(role)}
              aria-label={isCurrentlyActive ? 'Deactivate role' : 'Activate role'}
              className={cx(iconButtonClass, isToggling && 'opacity-60 cursor-not-allowed')}
            >
              {isToggling ? (
                <span className="inline-block h-4 w-4 2xl:h-4.5 2xl:w-4.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Power className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
              )}
            </button>
          </Tooltip>
        </>
      )}

      {canAdd && (
        <Tooltip content="Duplicate role" align="end">
          <button type="button" onClick={() => onClone(role)} aria-label="Duplicate role" className={iconButtonClass}>
            <Copy className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
          </button>
        </Tooltip>
      )}

      {canDelete && (
        <Tooltip content="Delete Role" align="end">
          <button
            type="button"
            onClick={() => onDelete(role)}
            aria-label="Delete role"
            className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}
          >
            <Trash2 className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
