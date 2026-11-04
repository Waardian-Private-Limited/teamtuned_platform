'use client';

import React from 'react';
import { cx } from '@/theme/tokens';

const OPTIONS = [0.5, 1] as const;

/**
 * In the approve dialog of a comp-off request: the days earned, which the approver may resize between half a day
 * and a full day, with an optional reason. A change is kept on the grant and the day's history for the auditor.
 * Reports the change to send (null when the amount is left as it is).
 */
export function CompOffUnitsSection({ units, requested, onChange }: { units: number; requested: number; onChange: (value: Record<string, unknown> | null) => void }) {
  const [value, setValue] = React.useState<number>(units);
  const [note, setNote] = React.useState('');
  React.useEffect(() => { setValue(units); setNote(''); }, [units]);
  React.useEffect(() => {
    onChange(value !== units ? { units: value, ...(note.trim() ? { note: note.trim() } : {}) } : null);
  }, [value, note, units, onChange]);

  const changed = value !== units;
  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-muted">Days earned. Change it if half a day or a full day is the fairer amount; your name and reason (if you give one) stay on record.</p>
      <div role="radiogroup" aria-label="Days earned" className="grid grid-cols-2 gap-1 rounded-lg border border-line/60 bg-bg-subtle p-0.5">
        {OPTIONS.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => setValue(o)}
            className={cx('h-9 rounded-md text-sm font-semibold transition-colors', value === o ? 'border border-line/70 bg-surface font-bold text-fg shadow-xs' : 'text-fg-muted hover:text-fg')}>
            {o === 0.5 ? 'Half day (0.5)' : 'Full day (1)'}{o === requested ? ' · asked' : ''}
          </button>
        ))}
      </div>
      {changed && (
        <label className="block">
          <span className="text-xs font-semibold text-fg">Why change it? <span className="font-normal text-fg-muted">(optional)</span></span>
          <input value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder="e.g. worked only the morning" className="mt-1 w-full rounded border border-line bg-transparent px-3 py-2 text-sm text-fg outline-none focus:border-fg" />
        </label>
      )}
    </div>
  );
}
