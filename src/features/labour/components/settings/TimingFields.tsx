'use client';

import React from 'react';
import { TextField } from '@/components/ui/FormControls';
import type { LabourTimings } from '../../types/labour.types';
import { timingsSummary } from '../../utils/timings';

/** The four times of a labour clock with a live reading of what they mean. */
export function TimingFields({ value, onChange, errors, disabled }: { value: LabourTimings; onChange: (v: LabourTimings) => void; errors: Record<string, string>; disabled?: boolean }) {
  const set = (p: Partial<LabourTimings>) => onChange({ ...value, ...p });
  const summary = timingsSummary(value);
  return (
    <div className="space-y-3">
      <TextField label="Attendance cutoff" type="time" value={value.attendanceCutoff} error={errors.attendanceCutoff} disabled={disabled}
        hint="A punch before this time closes the previous day only while it is still open; otherwise, and always from this time on, it belongs to the new day." onChange={(v) => set({ attendanceCutoff: v })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Standard (day rate) from" type="time" value={value.standardStart} error={errors.standardStart} disabled={disabled} onChange={(v) => set({ standardStart: v })} />
        <TextField label="Standard until" type="time" value={value.standardEnd} error={errors.standardEnd} disabled={disabled} onChange={(v) => set({ standardEnd: v })} />
      </div>
      <TextField label="Overtime until" type="time" value={value.overtimeEnd || ''} error={errors.overtimeEnd} disabled={disabled}
        hint="Overtime runs from the standard end to this time. Leave empty for no overtime window (night starts at the standard end)." onChange={(v) => set({ overtimeEnd: v || null })} />
      <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg sm:text-sm">
        {summary ? <><span className="font-semibold">{summary}</span><span className="block text-[11px] text-fg-muted">Night runs until the next cutoff. Time before the standard start (an early or fresh session) is paid at the day rate. No overtime or night rate set = day rate.</span></> : 'Fix the times above to see how a day is paid.'}
      </p>
    </div>
  );
}
