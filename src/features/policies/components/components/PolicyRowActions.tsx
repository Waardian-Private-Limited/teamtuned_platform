'use client';

import { SquarePen, Power, Copy, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Policy } from '../../types/policies.model';

interface PolicyRowActionsProps {
  policy: Policy;
  canEdit: boolean;
  canAdd: boolean;
  canDelete: boolean;
  onEdit: (policy: Policy) => void;
  onClone: (policy: Policy) => void;
  onDelete: (policy: Policy) => void;
  onToggleStatus: (policy: Policy) => void;
  isToggling?: boolean;
}

const iconButtonClass =
  'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

export function PolicyRowActions({ policy, canEdit, canAdd, canDelete, onEdit, onClone, onDelete, onToggleStatus, isToggling = false }: PolicyRowActionsProps) {
  const isActive = policy.status === 'active';

  return (
    <div className="flex items-center justify-end gap-1">
      {canEdit && (
        <>
          <Tooltip content="Open policy editor">
            <button type="button" onClick={() => onEdit(policy)} aria-label="Edit policy" className={iconButtonClass}>
              <SquarePen className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
            </button>
          </Tooltip>
          <Tooltip content={isActive ? 'Deactivate' : 'Activate'} align="end">
            <button
              type="button"
              disabled={isToggling}
              onClick={() => onToggleStatus(policy)}
              aria-label={isActive ? 'Deactivate policy' : 'Activate policy'}
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
        <Tooltip content="Duplicate policy" align="end">
          <button type="button" onClick={() => onClone(policy)} aria-label="Duplicate policy" className={iconButtonClass}>
            <Copy className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
          </button>
        </Tooltip>
      )}

      {canDelete && (
        <Tooltip content="Delete policy" align="end">
          <button type="button" onClick={() => onDelete(policy)} aria-label="Delete policy" className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}>
            <Trash2 className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
