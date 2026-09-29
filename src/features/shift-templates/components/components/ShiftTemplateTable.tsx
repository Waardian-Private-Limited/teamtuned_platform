'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { cx } from '@/theme/tokens';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import type { ShiftTemplate } from '../../types/shiftTemplates.model';
import { ShiftTemplateRowActions } from './ShiftTemplateRowActions';
import { ShiftTiming } from './ShiftTiming';

interface ShiftTemplateTableProps {
  shifts: ShiftTemplate[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (shift: ShiftTemplate) => void;
  onDelete: (shift: ShiftTemplate) => void;
  onToggleStatus: (shift: ShiftTemplate) => void;
  togglingId?: number | null;
}

const cellHeaderClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';
const cellClass = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4';

export function ShiftTemplateTable({ shifts, canEdit, canDelete, onEdit, onDelete, onToggleStatus, togglingId }: ShiftTemplateTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[540px] border-separate border-spacing-0 md:min-w-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(cellHeaderClass, 'first:rounded-tl-xl')}>Shift</th>
            <th className={cx(cellHeaderClass, 'w-56 sm:w-64 lg:w-72 2xl:w-80')}>Timing</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-44')}>Status</th>
            <th className={cx(cellHeaderClass, 'w-28 text-right last:rounded-tr-xl sm:w-32 lg:w-36 2xl:w-44')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) => (
            <tr key={shift.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className={cellClass}>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-fg sm:text-sm 2xl:text-base">{shift.name}</div>
                  <SubOrgBadge subOrgId={shift.subOrganizationId} />
                </div>
              </td>
              <td className={cellClass}>
                <ShiftTiming shift={shift} />
              </td>
              <td className={cellClass}>
                <StatusPill label={shift.status} tone={shift.status} />
              </td>
              <td className={cellClass}>
                <ShiftTemplateRowActions
                  shift={shift}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                  isToggling={togglingId === shift.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
