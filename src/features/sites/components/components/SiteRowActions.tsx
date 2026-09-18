'use client';

import { Power, SquarePen, Trash2, Users, Wallet } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Site } from '../../types/sites.model';

interface SiteRowActionsProps {
  site: Site;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (site: Site) => void;
  onDelete: (site: Site) => void;
  onToggleStatus: (site: Site) => void;
  onOpenBudget: (site: Site) => void;
  onOpenIncharges?: (site: Site) => void;
  isToggling?: boolean;
}

const iconButtonClass =
  'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

export function SiteRowActions({
  site,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenBudget,
  onOpenIncharges,
  isToggling = false,
}: SiteRowActionsProps) {
  const isCurrentlyActive = site.status === 'active';

  return (
    <div className="flex items-center justify-end gap-1">
      {site.hasBudget && (
        <Tooltip content="View Budget">
          <button
            type="button"
            onClick={() => onOpenBudget(site)}
            aria-label="View budget"
            className={iconButtonClass}
          >
            <Wallet className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
          </button>
        </Tooltip>
      )}

      {canEdit && onOpenIncharges && (
        <Tooltip content="Manage Incharges">
          <button
            type="button"
            onClick={() => onOpenIncharges(site)}
            aria-label="Manage site incharges"
            className={iconButtonClass}
          >
            <Users className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
          </button>
        </Tooltip>
      )}

      {canEdit && (
        <>
          <Tooltip content="Edit Site">
            <button
              type="button"
              onClick={() => onEdit(site)}
              aria-label="Edit site"
              className={iconButtonClass}
            >
              <SquarePen className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
            </button>
          </Tooltip>

          <Tooltip content={isCurrentlyActive ? 'Deactivate' : 'Activate'} align="end">
            <button
              type="button"
              disabled={isToggling}
              onClick={() => onToggleStatus(site)}
              aria-label={isCurrentlyActive ? 'Deactivate site' : 'Activate site'}
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
        <Tooltip content="Delete Site" align="end">
          <button
            type="button"
            onClick={() => onDelete(site)}
            aria-label="Delete site"
            className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}
          >
            <Trash2 className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
