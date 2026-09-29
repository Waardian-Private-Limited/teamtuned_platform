'use client';

import { Power, SquarePen, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { ShiftTemplate } from '../../types/shiftTemplates.model';

interface ShiftTemplateRowActionsProps {
  shift: ShiftTemplate;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (shift: ShiftTemplate) => void;
  onDelete: (shift: ShiftTemplate) => void;
  onToggleStatus: (shift: ShiftTemplate) => void;
  isToggling?: boolean;
}

const iconButtonClass =
  'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

export function ShiftTemplateRowActions({
  shift,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  isToggling = false,
}: ShiftTemplateRowActionsProps) {
  const isActive = shift.status === 'active';

  return (
    <div className="flex items-center justify-end gap-1">
      {canEdit && (
        <>
          <Tooltip content="Edit Shift">
            <button type="button" onClick={() => onEdit(shift)} aria-label="Edit shift" className={iconButtonClass}>
              <SquarePen className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
            </button>
          </Tooltip>

          <Tooltip content={isActive ? 'Deactivate' : 'Activate'} align="end">
            <button
              type="button"
              disabled={isToggling}
              onClick={() => onToggleStatus(shift)}
              aria-label={isActive ? 'Deactivate shift' : 'Activate shift'}
              className={cx(iconButtonClass, isToggling && 'cursor-not-allowed opacity-60')}
            >
              {isToggling ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent 2xl:h-4.5 2xl:w-4.5" />
              ) : (
                <Power className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
              )}
            </button>
          </Tooltip>
        </>
      )}

      {canDelete && (
        <Tooltip content="Delete Shift" align="end">
          <button
            type="button"
            onClick={() => onDelete(shift)}
            aria-label="Delete shift"
            className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}
          >
            <Trash2 className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
