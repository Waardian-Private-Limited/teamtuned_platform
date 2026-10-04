'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import type { ShiftOpt } from '../../../hooks/useTeamsCatalog';
import { cellClass, cellLabel, cellTitle, shiftMap, type CycleCell } from '../../../utils/patternCycle';

export function PatternStrip({ cycle, shifts, compact }: { cycle: CycleCell[]; shifts: ShiftOpt[]; compact?: boolean }) {
  const map = React.useMemo(() => shiftMap(shifts), [shifts]);
  return (
    <div className="flex flex-wrap gap-1" aria-label="Pattern cycle">
      {cycle.map((c, i) => (
        <span
          key={i}
          title={`Day ${i + 1}: ${cellTitle(c, map)}`}
          className={cx(
            'inline-flex items-center justify-center rounded-md font-semibold',
            compact ? 'h-5 min-w-5 px-1 text-[9px]' : 'h-6 min-w-6 px-1.5 text-[10px]',
            cellClass(c, map)
          )}
        >
          {cellLabel(c, map)}
        </span>
      ))}
    </div>
  );
}
