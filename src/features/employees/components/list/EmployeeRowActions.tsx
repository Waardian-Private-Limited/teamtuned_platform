'use client';

import { History, Power, SquarePen, Trash2, UserX } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { EmployeeListItemDto } from '../../types/employees.dto';
import type { StatusAction } from '../../hooks/useEmployeeStatus';

interface EmployeeRowActionsProps {
  employee: EmployeeListItemDto;
  canEdit: boolean;
  canDelete: boolean;
  busy: boolean;
  onEdit: (employee: EmployeeListItemDto) => void;
  onAction: (employee: EmployeeListItemDto, action: StatusAction) => void;
  onHistory?: (employee: EmployeeListItemDto) => void;
}

const iconButtonClass =
  'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';
const iconClass = 'h-4 w-4 2xl:h-4.5 2xl:w-4.5';

export function EmployeeRowActions({ employee, canEdit, canDelete, busy, onEdit, onAction, onHistory }: EmployeeRowActionsProps) {
  const terminated = employee.status === 'Terminated';
  const active = employee.status === 'Active';
  const invited = employee.status === 'Invited';

  return (
    <div className="flex items-center justify-end gap-1">
      {onHistory && (
        <Tooltip content="History">
          <button type="button" onClick={() => onHistory(employee)} aria-label={`History of ${employee.name}`} className={iconButtonClass}>
            <History className={iconClass} />
          </button>
        </Tooltip>
      )}
      {canEdit && (
        <Tooltip content="Edit">
          <button type="button" onClick={() => onEdit(employee)} aria-label={`Edit ${employee.name}`} className={iconButtonClass}>
            <SquarePen className={iconClass} />
          </button>
        </Tooltip>
      )}
      {canEdit && !terminated && (
        <Tooltip content={active ? 'Deactivate' : 'Activate'} align="end">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(employee, active ? 'deactivate' : 'activate')}
            aria-label={active ? `Deactivate ${employee.name}` : `Activate ${employee.name}`}
            className={iconButtonClass}
          >
            {busy ? <span className={cx(iconClass, 'inline-block animate-spin rounded-full border-2 border-current border-t-transparent')} /> : <Power className={iconClass} />}
          </button>
        </Tooltip>
      )}
      {canEdit && !terminated && !invited && (
        <Tooltip content="Terminate" align="end">
          <button type="button" disabled={busy} onClick={() => onAction(employee, 'terminate')} aria-label={`Terminate ${employee.name}`} className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}>
            <UserX className={iconClass} />
          </button>
        </Tooltip>
      )}
      {canDelete && invited && (
        <Tooltip content="Delete" align="end">
          <button type="button" disabled={busy} onClick={() => onAction(employee, 'delete')} aria-label={`Delete ${employee.name}`} className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}>
            <Trash2 className={iconClass} />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
