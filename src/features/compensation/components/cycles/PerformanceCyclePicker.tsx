'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { LinkablePerformanceCycleDto } from '../../types/compensation.dto';
import { date } from '../../utils/format';

/** A cycle on offer; `released` is unknown for a linked cycle that is no longer offered. */
export type PickableCycle = Omit<LinkablePerformanceCycleDto, 'released'> & { released?: number };

/**
 * Pick the performance cycles an appraisal takes its ratings from: one yearly cycle, or several (quarters, halves) whose
 * scores are averaged. Cycles already linked stay listed even when they are no longer offered for new links.
 */
export function PerformanceCyclePicker({ cycles, value, onChange, disabled, error }: {
  cycles: PickableCycle[];
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  error?: string;
}) {
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  if (!cycles.length) return <p className="text-[11px] text-fg-muted sm:text-xs">No performance cycle has reached calibration yet. Ratings can be linked once one has.</p>;
  return (
    <div>
      <div className={cx('grid grid-cols-1 gap-1.5 sm:grid-cols-2', error && 'rounded-lg border border-[var(--tt-danger)] p-1.5')}>
        {cycles.map((c) => {
          const on = value.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => toggle(c.id)}
              className={cx(
                'flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                on ? 'border-fg bg-bg-subtle' : 'border-line bg-surface hover:bg-bg-subtle/50',
              )}
            >
              <span className={cx('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-fg bg-fg text-surface' : 'border-line-strong')}>
                {on && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-fg sm:text-sm">{c.name}</span>
                <span className="block text-[11px] text-fg-muted">
                  {c.period_start ? `${date(c.period_start)} – ${date(c.period_end)} · ` : ''}{c.released !== undefined ? `${c.released} released · ` : ''}<span className="capitalize">{c.status}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-[11px] text-[var(--tt-danger)]">{error}</p>}
      {value.length > 1 && <p className="mt-1 text-[11px] text-fg-muted">Several cycles: each person’s overall scores are averaged and placed on the latest cycle’s ratings. Someone rated in only one keeps that rating.</p>}
    </div>
  );
}
