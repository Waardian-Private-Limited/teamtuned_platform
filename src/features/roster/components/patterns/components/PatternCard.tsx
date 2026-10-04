'use client';

import { SquarePen, Trash2 } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import { cx } from '@/theme/tokens';
import type { Pattern } from '../../../types/roster.types';
import type { ShiftOpt } from '../../../hooks/useTeamsCatalog';
import { iconBtn } from '../../catalog-shared/catalogUi';
import { PatternStrip } from './PatternStrip';

interface Props {
  pattern: Pattern;
  shifts: ShiftOpt[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (p: Pattern) => void;
  onDelete: (p: Pattern) => void;
}

export function PatternCard({ pattern, shifts, canEdit, canDelete, onEdit, onDelete }: Props) {
  const users = pattern.usage_count ?? 0;
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-fg sm:text-base">{pattern.name}</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            {pattern.cycle_days} {pattern.cycle_days === 1 ? 'day' : 'days'} cycle · {users === 0 ? 'No one uses it yet' : `${users} ${users === 1 ? 'person uses' : 'people use'} it`}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          {canEdit && <button type="button" onClick={() => onEdit(pattern)} aria-label={`Edit ${pattern.name}`} className={iconBtn}><SquarePen className="h-4 w-4" /></button>}
          {canDelete && <button type="button" onClick={() => onDelete(pattern)} aria-label={`Delete ${pattern.name}`} className={cx(iconBtn, 'hover:text-[var(--tt-danger)]')}><Trash2 className="h-4 w-4" /></button>}
        </div>
      </div>
      <PatternStrip cycle={pattern.cycle} shifts={shifts} />
      <div className="mt-auto flex items-center gap-2">
        <StatusPill label={pattern.status} tone={pattern.status === 'active' ? 'active' : 'inactive'} />
        <SubOrgBadge subOrgId={pattern.sub_organization_id} />
      </div>
    </li>
  );
}
