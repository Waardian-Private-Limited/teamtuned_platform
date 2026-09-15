'use client';

import { Power, SquarePen, Trash2, Users } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Department } from '../../types/departments.model';

interface DepartmentRowActionsProps {
  department: Department;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
  onToggleStatus: (department: Department) => void;
  onOpenHeads: (department: Department) => void;
  isToggling?: boolean;
}

const iconButtonClass =
  'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

export function DepartmentRowActions({
  department,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenHeads,
  isToggling = false,
}: DepartmentRowActionsProps) {
  const isCurrentlyActive = department.status === 'active';

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip content="Manage Heads">
        <button
          type="button"
          onClick={() => onOpenHeads(department)}
          aria-label="Manage heads"
          className={iconButtonClass}
        >
          <Users className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
        </button>
      </Tooltip>

      {canEdit && (
        <>
          <Tooltip content="Edit Department">
            <button
              type="button"
              onClick={() => onEdit(department)}
              aria-label="Edit department"
              className={iconButtonClass}
            >
              <SquarePen className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
            </button>
          </Tooltip>

          <Tooltip content={isCurrentlyActive ? 'Deactivate department' : 'Activate department'}>
            <button
              type="button"
              disabled={isToggling}
              onClick={() => onToggleStatus(department)}
              aria-label={isCurrentlyActive ? 'Deactivate department' : 'Activate department'}
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

      {canDelete && (
        <Tooltip content="Delete Department">
          <button
            type="button"
            onClick={() => onDelete(department)}
            aria-label="Delete department"
            className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}
          >
            <Trash2 className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
