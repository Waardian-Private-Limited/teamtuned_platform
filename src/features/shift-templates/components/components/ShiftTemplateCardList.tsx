'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import type { ShiftTemplate } from '../../types/shiftTemplates.model';
import { ShiftTemplateRowActions } from './ShiftTemplateRowActions';
import { ShiftTiming } from './ShiftTiming';

interface ShiftTemplateCardListProps {
  shifts: ShiftTemplate[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (shift: ShiftTemplate) => void;
  onDelete: (shift: ShiftTemplate) => void;
  onToggleStatus: (shift: ShiftTemplate) => void;
  togglingId?: number | null;
}

export function ShiftTemplateCardList({ shifts, canEdit, canDelete, onEdit, onDelete, onToggleStatus, togglingId }: ShiftTemplateCardListProps) {
  return (
    <>
      {shifts.map((shift) => (
        <div key={shift.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 truncate text-sm font-medium text-fg">{shift.name}</div>
            <StatusPill label={shift.status} tone={shift.status} />
          </div>
          <ShiftTiming shift={shift} className="mt-1.5" />
          <div className="mt-3 flex justify-end">
            <ShiftTemplateRowActions
              shift={shift}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
              isToggling={togglingId === shift.id}
            />
          </div>
        </div>
      ))}
    </>
  );
}
