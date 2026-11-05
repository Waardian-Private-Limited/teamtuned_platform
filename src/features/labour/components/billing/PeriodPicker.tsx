'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { BillingPeriod } from '../../api/labour.api';
import { DateFilter, selectCls } from '../shared/Primitives';

/** A billing period: a whole month, or any from/to dates (the server allows up to a year). */
export interface Period { mode: 'month' | 'range'; month: string; from: string; to: string }

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** A month `offset` months from this one, as a Period (from/to preset to the same month for a later switch to dates). */
export function monthPeriod(offset = 0): Period {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { mode: 'month', month: ymd(start).slice(0, 7), from: ymd(start), to: ymd(end) };
}

export const periodParams = (p: Period): BillingPeriod => (p.mode === 'month' ? { month: p.month } : { from: p.from, to: p.to });

/** Why the period cannot be used yet, or '' when it can. */
export function periodProblem(p: Period): string {
  if (p.mode === 'month') return p.month ? '' : 'Choose a month';
  if (!p.from || !p.to) return 'Choose both dates';
  return p.to < p.from ? 'The end date is before the start date' : '';
}

export function PeriodPicker({ value, onChange, maxMonth }: { value: Period; onChange: (p: Period) => void; maxMonth?: string }) {
  const patch = (x: Partial<Period>) => onChange({ ...value, ...x });
  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      <SegmentedControl options={[{ value: 'month' as const, label: 'Month' }, { value: 'range' as const, label: 'Date range' }]} value={value.mode} onChange={(mode) => patch({ mode })} fitText />
      {value.mode === 'month' ? (
        <label className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-fg-muted">
          Month<input type="month" value={value.month} max={maxMonth} onChange={(e) => e.target.value && patch({ month: e.target.value })} className={cx(selectCls, 'min-w-0 flex-1 md:w-40')} />
        </label>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <DateFilter label="From" value={value.from} onChange={(from) => patch({ from })} />
          <DateFilter label="To" value={value.to} onChange={(to) => patch({ to })} />
        </div>
      )}
    </div>
  );
}
