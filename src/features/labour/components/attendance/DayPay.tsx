'use client';

import React from 'react';
import type { AttendanceDay } from '../../types/labour.types';
import { hajriLabel } from '../../utils/pay';

/** "1½ H" for hajri-paid days (marked when set by hand), the basis otherwise. */
export function DayPay({ d, compact = false }: { d: AttendanceDay; compact?: boolean }) {
  if (d.payBasis === 'hajri') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums" title={d.hajriOverridden ? 'Hajri set by hand' : 'Hajri from the slab table'}>
        <span className="font-bold text-fg">{hajriLabel(d.hajri)} H</span>
        {d.hajriOverridden && <span className="rounded border border-line px-1 text-[10px] font-semibold uppercase text-fg-muted">set</span>}
      </span>
    );
  }
  if (d.payBasis === 'measurement') return <span className="whitespace-nowrap text-xs text-fg-muted">{compact ? 'Meas.' : 'By measurement'}</span>;
  if (d.payBasis === 'hourly') return <span className="text-xs text-fg-muted">Hourly</span>;
  return <span className="whitespace-nowrap text-xs text-fg-muted">No rate</span>;
}
