'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { formatDayTime } from '@/lib/datetime';
import type { RegularizationTime, RegularizationTrailStep } from '@/features/approvals/types/approvals';

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The punch lines a regularization's times table already shows, so the facts list can skip them. */
export const TIME_LINE_KEYS = new Set(['recorded_in', 'recorded_out', 'requested_in', 'requested_out']);

/** Check-in and check-out side by side: recorded, what the employee asked, and what approving applies. */
export function RegularizationTimesTable({ times }: { times: { in: RegularizationTime; out: RegularizationTime } }) {
  const rows = ([['Check-in', times.in], ['Check-out', times.out]] as const).filter(([, t]) => t.editable || t.recorded);
  if (!rows.length) return null;
  return (
    <section aria-label="Times">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Times</p>
      <div className="overflow-hidden rounded border border-line">
        <table className="w-full text-sm">
          <thead className="bg-bg-subtle text-left text-xs text-fg-muted">
            <tr>
              <th className="px-3 py-2 font-medium" />
              <th className="px-3 py-2 font-medium">Recorded</th>
              <th className="px-3 py-2 font-medium">Asked</th>
              <th className="px-3 py-2 font-medium">Will be</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(([label, t]) => {
              const corrected = Boolean(t.current && t.asked && t.current !== t.asked);
              return (
                <tr key={label}>
                  <td className="px-3 py-2.5 font-semibold text-fg">{label}</td>
                  <td className="px-3 py-2.5 tabular-nums text-fg-muted">{t.recorded ?? 'Not recorded'}</td>
                  <td className={cx('px-3 py-2.5 tabular-nums', corrected ? 'text-fg-muted line-through' : 'text-fg')}>{t.asked ?? '—'}</td>
                  <td className="px-3 py-2.5 text-base font-extrabold tabular-nums text-fg">{t.current ?? t.recorded ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Who set the times, oldest first. Shown once an approver has corrected them. */
export function RegularizationTrail({ steps }: { steps: RegularizationTrailStep[] }) {
  if (steps.length < 2) return null;
  return (
    <section aria-label="Changes">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Changes</p>
      <ol className="space-y-3">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={i} className="relative flex gap-3">
              <div className="flex w-3 flex-col items-center">
                <span className={cx('mt-1.5 h-2.5 w-2.5 rounded-[2px] border-[1.5px] border-fg', last ? 'bg-fg' : 'bg-bg')} />
                {!last && <span className="mt-1 w-px flex-1 bg-line" />}
              </div>
              <div className="min-w-0 pb-1">
                <p className="text-sm font-semibold text-fg">{s.by === 'employee' ? `${s.name ?? 'Employee'} asked` : `${s.name ?? 'Approver'} changed the times`}</p>
                <p className="text-sm tabular-nums text-fg">
                  {[s.in_time && `Check-in ${s.in_time}`, s.out_time && `Check-out ${s.out_time}`].filter(Boolean).join('  ·  ')}
                </p>
                <p className="text-xs text-fg-muted">{[s.by === 'approver' ? s.step : null, s.at ? formatDayTime(s.at) : null].filter(Boolean).join(' · ')}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * In the approve dialog: the times approving will apply, each one the request changes open to
 * correction. Reports only the times the approver changed (null when none), and whether they are valid.
 */
export function RegularizationTimesSection({ times, onChange }: { times: { in: RegularizationTime; out: RegularizationTime }; onChange: (value: { in_time?: string; out_time?: string } | null, valid: boolean) => void }) {
  const [inTime, setIn] = React.useState(times.in.current ?? '');
  const [outTime, setOut] = React.useState(times.out.current ?? '');

  const inError = times.in.editable && !CLOCK.test(inTime) ? 'Pick a check-in time' : '';
  const outError = times.out.editable && !CLOCK.test(outTime) ? 'Pick a check-out time' : '';

  React.useEffect(() => {
    if (inError || outError) return onChange(null, false);
    const changed = {
      ...(times.in.editable && inTime !== times.in.current ? { in_time: inTime } : {}),
      ...(times.out.editable && outTime !== times.out.current ? { out_time: outTime } : {}),
    };
    onChange(Object.keys(changed).length ? changed : null, true);
  }, [inTime, outTime, inError, outError, times, onChange]);

  const field = (label: string, t: RegularizationTime, value: string, set: (v: string) => void, error: string) => {
    const changed = Boolean(t.asked && value && value !== t.asked);
    return (
      <label className="block">
        <span className="text-xs font-semibold text-fg">{label}</span>
        <div className={cx('mt-1 flex items-center gap-2 rounded border px-3 py-2', error ? 'border-[var(--tt-danger)]' : changed ? 'border-fg' : 'border-line')}>
          <Clock className="h-4 w-4 text-fg-muted" />
          <input type="time" value={value} onChange={(e) => set(e.target.value)} aria-invalid={Boolean(error) || undefined} className="w-full bg-transparent text-base font-bold tabular-nums text-fg outline-none" />
        </div>
        {error ? <span className="mt-1 block text-xs text-[var(--tt-danger)]">{error}</span> : t.asked && <span className="mt-1 block text-xs text-fg-muted">{changed ? `Employee asked ${t.asked}` : `Asked ${t.asked}`}</span>}
      </label>
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-muted">These times will be applied. Change one to correct it; the employee&apos;s ask stays on record.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {times.in.editable && field('Check-in', times.in, inTime, setIn, inError)}
        {times.out.editable && field('Check-out', times.out, outTime, setOut, outError)}
      </div>
    </div>
  );
}
