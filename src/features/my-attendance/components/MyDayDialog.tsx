'use client';

import React from 'react';
import { Hourglass, ListChecks } from 'lucide-react';
import { DayView } from '@/features/detailed-attendance/components/components/DayDialog';
import type { DayDetail } from '@/features/detailed-attendance/types/detailed.model';
import { useMyDay } from '../hooks/useMyDay';
import { STATUS_TEXT } from '../constants/regularization.constants';
import type { RegularizationStatus } from '../types/regularization.model';
import { RegularizeDialog } from './RegularizeDialog';

interface Props {
  date: string | null;
  /** Bump to read the day again (something else changed it). */
  reloadKey: number;
  onClose: () => void;
  /** Called after a regularization was raised or withdrawn. */
  onChanged: () => void;
}

/**
 * The signed-in employee's own day, with Regularize where an admin would see Override. A request
 * that is waiting or decided shows its status in place of the call to action.
 */
export function MyDayDialog({ date, reloadKey, onClose, onChanged }: Props) {
  const [regularize, setRegularize] = React.useState(false);
  const [saved, setSaved] = React.useState(0);
  const { data, loading, error } = useMyDay(date, reloadKey + saved);

  const actions = (d: DayDetail) => {
    const status = d.regularization?.status;
    const showsStatus = status === 'pending' || status === 'approved';
    return (
      <button type="button" onClick={() => setRegularize(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] sm:text-sm">
        {showsStatus ? <Hourglass className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
        {showsStatus ? `Regularization · ${STATUS_TEXT[status as RegularizationStatus]}` : 'Regularize attendance'}
      </button>
    );
  };

  return (
    <>
      <DayView date={date} data={data} loading={loading} error={error} childOpen={regularize} onClose={onClose} actions={data && !data.locked ? actions : undefined} />
      {regularize && date && (
        <RegularizeDialog date={date} onClose={() => setRegularize(false)} onDone={() => { setRegularize(false); setSaved((v) => v + 1); onChanged(); }} />
      )}
    </>
  );
}
