'use client';

import { SquarePen, Power, Copy, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { TrackingPolicyDto } from '../../types/tracking.dto';

interface TrackingPolicyRowActionsProps {
  policy: TrackingPolicyDto;
  canManage: boolean;
  onEdit: (policy: TrackingPolicyDto) => void;
  onClone: (policy: TrackingPolicyDto) => void;
  onDelete: (policy: TrackingPolicyDto) => void;
  onToggleStatus: (policy: TrackingPolicyDto) => void;
  isToggling?: boolean;
}

const iconButtonClass =
  'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

export function TrackingPolicyRowActions({
  policy,
  canManage,
  onEdit,
  onClone,
  onDelete,
  onToggleStatus,
  isToggling = false,
}: TrackingPolicyRowActionsProps) {
  const isActive = policy.status === 'active';

  return (
    <div className="flex items-center justify-end gap-1">
      {canManage && (
        <>
          <Tooltip content="Open policy editor">
            <button
              type="button"
              onClick={() => onEdit(policy)}
              aria-label="Edit policy"
              className={iconButtonClass}
            >
              <SquarePen className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
            </button>
          </Tooltip>
          <Tooltip content={isActive ? 'Archive policy' : 'Restore policy'} align="end">
            <button
              type="button"
              disabled={isToggling}
              onClick={() => onToggleStatus(policy)}
              aria-label={isActive ? 'Archive policy' : 'Restore policy'}
              className={cx(iconButtonClass, isToggling && 'opacity-60 cursor-not-allowed')}
            >
              {isToggling ? (
                <span className="inline-block h-4 w-4 2xl:h-4.5 2xl:w-4.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Power className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
              )}
            </button>
          </Tooltip>
          <Tooltip content="Duplicate policy" align="end">
            <button
              type="button"
              onClick={() => onClone(policy)}
              aria-label="Duplicate policy"
              className={iconButtonClass}
            >
              <Copy className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
            </button>
          </Tooltip>
          <Tooltip content="Delete policy" align="end">
            <button
              type="button"
              onClick={() => onDelete(policy)}
              aria-label="Delete policy"
              className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}
            >
              <Trash2 className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
            </button>
          </Tooltip>
        </>
      )}
    </div>
  );
}
