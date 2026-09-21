'use client';

import { Power, SquarePen, Star, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { SubOrganization } from '../../types/sub-organizations.model';

interface SubOrganizationRowActionsProps {
  subOrganization: SubOrganization;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (subOrg: SubOrganization) => void;
  onDelete: (subOrg: SubOrganization) => void;
  onToggleStatus: (subOrg: SubOrganization) => void;
  onSetPrimary: (subOrg: SubOrganization) => void;
  isToggling?: boolean;
  isSettingPrimary?: boolean;
}

const iconButtonClass =
  'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

export function SubOrganizationRowActions({
  subOrganization,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  onSetPrimary,
  isToggling = false,
  isSettingPrimary = false,
}: SubOrganizationRowActionsProps) {
  const isCurrentlyActive = subOrganization.status === 'active';

  return (
    <div className="flex items-center justify-end gap-1">
      {canEdit && !subOrganization.isPrimary && isCurrentlyActive && (
        <Tooltip content="Make primary">
          <button
            type="button"
            disabled={isSettingPrimary}
            onClick={() => onSetPrimary(subOrganization)}
            aria-label="Make primary sub-organization"
            className={cx(iconButtonClass, 'hover:text-[var(--tt-primary)]')}
          >
            {isSettingPrimary ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent 2xl:h-4.5 2xl:w-4.5" />
            ) : (
              <Star className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
            )}
          </button>
        </Tooltip>
      )}

      {canEdit && (
        <>
          <Tooltip content="Edit Sub-Organization">
            <button
              type="button"
              onClick={() => onEdit(subOrganization)}
              aria-label="Edit sub-organization"
              className={iconButtonClass}
            >
              <SquarePen className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
            </button>
          </Tooltip>

          <Tooltip content={isCurrentlyActive ? 'Deactivate' : 'Activate'} align="end">
            <button
              type="button"
              disabled={isToggling}
              onClick={() => onToggleStatus(subOrganization)}
              aria-label={isCurrentlyActive ? 'Deactivate sub-organization' : 'Activate sub-organization'}
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

      {canDelete && isCurrentlyActive && (
        <Tooltip content="Deactivate Sub-Organization" align="end">
          <button
            type="button"
            onClick={() => onDelete(subOrganization)}
            aria-label="Deactivate sub-organization"
            className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}
          >
            <Trash2 className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
