'use client';

import React from 'react';
import type { DayDetail } from '../types/detailed.model';
import { DayDialog } from './components/DayDialog';
import { OverrideDialog } from './components/OverrideDialog';

interface Props {
  employeeId: number | null;
  date: string | null;
  /** Bump to read the day again (something else changed it). */
  reloadKey?: number;
  onClose: () => void;
  /** Adds a "Monthly attendance" action; leave out where the month is already on screen. */
  onMonth?: (employeeId: number, month: string) => void;
  /** Called after an override was saved or removed. */
  onChanged?: () => void;
}

/**
 * One employee's day with its override form: everything about a single date, usable from any
 * screen that shows dates (the list, the month, the payroll calendar).
 */
export function DayPopup({ employeeId, date, reloadKey = 0, onClose, onMonth, onChanged }: Props) {
  const [override, setOverride] = React.useState<DayDetail | null>(null);
  const [saved, setSaved] = React.useState(0);
  return (
    <>
      <DayDialog employeeId={employeeId} date={date} reloadKey={reloadKey + saved} childOpen={!!override} onClose={onClose} onMonth={onMonth} onOverride={setOverride} />
      <OverrideDialog
        open={!!override}
        employeeId={override ? override.employee.id : 0}
        employeeName={override ? override.employee.name : ''}
        date={override ? override.date : ''}
        currentStatus={override && override.day ? override.badge.label : null}
        hasOverride={!!override && !!override.override}
        onClose={() => setOverride(null)}
        onSaved={() => { setSaved((v) => v + 1); onChanged?.(); }}
      />
    </>
  );
}
