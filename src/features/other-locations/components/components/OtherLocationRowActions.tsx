'use client';

import { Power, SquarePen, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { OtherLocation } from '../../types/otherLocations.model';

interface OtherLocationRowActionsProps {
  location: OtherLocation;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (location: OtherLocation) => void;
  onDelete: (location: OtherLocation) => void;
  onToggleStatus: (location: OtherLocation) => void;
  isToggling?: boolean;
}

const iconButtonClass =
  'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

export function OtherLocationRowActions({
  location,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  isToggling = false,
}: OtherLocationRowActionsProps) {
  const isActive = location.status === 'active';

  return (
    <div className="flex items-center justify-end gap-1">
      {canEdit && (
        <>
          <Tooltip content="Edit Location">
            <button
              type="button"
              onClick={() => onEdit(location)}
              aria-label="Edit location"
              className={iconButtonClass}
            >
              <SquarePen className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
            </button>
          </Tooltip>

          <Tooltip content={isActive ? 'Deactivate' : 'Activate'} align="end">
            <button
              type="button"
              disabled={isToggling}
              onClick={() => onToggleStatus(location)}
              aria-label={isActive ? 'Deactivate location' : 'Activate location'}
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
        <Tooltip content="Delete Location" align="end">
          <button
            type="button"
            onClick={() => onDelete(location)}
            aria-label="Delete location"
            className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}
          >
            <Trash2 className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
