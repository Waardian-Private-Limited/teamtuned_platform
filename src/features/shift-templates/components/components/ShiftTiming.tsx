'use client';

import { cx, text } from '@/theme/tokens';
import type { ShiftTemplate } from '../../types/shiftTemplates.model';
import { formatClock, formatHours } from '../../utils/shiftTime';

/** "10:00 pm – 6:00 am +1 day" plus the working hours and break under it. */
export function ShiftTiming({ shift, className }: { shift: ShiftTemplate; className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-fg sm:text-sm 2xl:text-base">
        <span>
          {formatClock(shift.startTime)} – {formatClock(shift.endTime)}
        </span>
        {shift.crossesMidnight && (
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted sm:text-[11px]">
            +1 day
          </span>
        )}
      </div>
      <div className={cx(text.caption, 'mt-0.5 2xl:text-sm')}>
        {formatHours(shift.workingMinutes)} working
        {shift.breakMinutes > 0 ? ` · ${formatHours(shift.breakMinutes)} break` : ' · no break'}
      </div>
    </div>
  );
}
