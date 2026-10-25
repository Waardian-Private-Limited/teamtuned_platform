'use client';

import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';

export type Step = 1 | 2 | 3 | 4;
export const STEPS: ReadonlyArray<{ step: Step; label: string }> = [
  { step: 1, label: 'Bill' },
  { step: 2, label: 'Details & items' },
  { step: 3, label: 'Payment' },
  { step: 4, label: 'Review & submit' },
];

/** The numbered steps at the top of the form. */
export function StepHeader({ step, bill }: { step: Step; bill: number | null }) {
  return (
    <div className="space-y-2">
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Steps">
        {STEPS.map((s) => {
          const done = s.step < step;
          const current = s.step === step;
          return (
            <li key={s.step} aria-current={current ? 'step' : undefined} className="min-w-0">
              <div className={cx('h-1 rounded-full transition-opacity', done || current ? 'bg-fg' : 'bg-line', current ? 'opacity-100' : done ? 'opacity-60' : 'opacity-100')} />
              <p className={cx('mt-1.5 flex items-center gap-1 truncate text-[11px] sm:text-xs', current ? 'font-bold text-fg' : 'font-medium text-fg-muted')}>
                <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', current ? 'bg-fg text-[var(--tt-on-primary)]' : done ? 'bg-fg/70 text-[var(--tt-on-primary)]' : 'border border-line-strong text-fg-muted')}>
                  {done ? <Check className="h-2.5 w-2.5" aria-hidden /> : s.step}
                </span>
                <span className={cx('truncate', !current && 'hidden sm:inline')}>{s.label}</span>
              </p>
            </li>
          );
        })}
      </ol>
      {bill !== null && step < 4 && <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Bill {bill}</p>}
    </div>
  );
}
