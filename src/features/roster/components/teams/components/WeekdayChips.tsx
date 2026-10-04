'use client';

import { cx } from '@/theme/tokens';
import { WEEKDAYS } from '../../../constants/roster.constants';
import { daysToMask, maskToDays } from '../../../utils/rosterTime';

interface Props {
  mask: number;
  onChange: (mask: number) => void;
  disabled?: boolean;
}

export function WeekdayChips({ mask, onChange, disabled }: Props) {
  const on = maskToDays(mask);
  const toggle = (d: number) => onChange(daysToMask(on.includes(d) ? on.filter((x) => x !== d) : [...on, d]));
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Weekdays">
      {WEEKDAYS.map((label, d) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          aria-pressed={on.includes(d)}
          onClick={() => toggle(d)}
          className={cx(
            'h-7 min-w-9 rounded-md border px-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40',
            on.includes(d) ? 'border-fg bg-fg text-fg-inverted' : 'border-line bg-surface text-fg-muted hover:bg-bg-subtle'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
