'use client';

import { Power, SquarePen, Trash2 } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { cx } from '@/theme/tokens';
import { iconBtn } from '../../catalog-shared/catalogUi';
import { Spinner } from '../../catalog-shared/Spinner';
import type { RosterUnit } from '../../../types/roster.types';

interface Props {
  unit: RosterUnit;
  canEdit: boolean;
  canDelete: boolean;
  busy: boolean;
  onEdit: (u: RosterUnit) => void;
  onToggle: (u: RosterUnit) => void;
  onDelete: (u: RosterUnit) => void;
}

export function TeamRowActions({ unit, canEdit, canDelete, busy, onEdit, onToggle, onDelete }: Props) {
  const active = unit.status === 'active';
  return (
    <div className="flex items-center justify-end gap-0.5">
      {canEdit && (
        <>
          <Tooltip content="Edit team">
            <button type="button" onClick={() => onEdit(unit)} aria-label="Edit team" className={iconBtn}>
              <SquarePen className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content={active ? 'Deactivate' : 'Activate'}>
            <button type="button" disabled={busy} onClick={() => onToggle(unit)} aria-label={active ? 'Deactivate team' : 'Activate team'} className={iconBtn}>
              {busy ? <Spinner className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </button>
          </Tooltip>
        </>
      )}
      {canDelete && (
        <Tooltip content="Delete team" align="end">
          <button type="button" onClick={() => onDelete(unit)} aria-label="Delete team" className={cx(iconBtn, 'hover:text-[var(--tt-danger)]')}>
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
