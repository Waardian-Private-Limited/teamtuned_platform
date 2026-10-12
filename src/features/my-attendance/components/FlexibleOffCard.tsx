'use client';

import React from 'react';
import { CalendarOff, X } from 'lucide-react';
import { addMonths, formatDate, formatMonth, monthRange } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { controlClass } from '@/features/detailed-attendance/components/components/controls';
import { useFlexibleOff } from '../hooks/useFlexibleOff';

/**
 * "Flexible week off": the employee picks which dates are their week off, up to the policy's monthly
 * quota. Shown only when their week off is flexible. Unpicked days are ordinary working days.
 */
export function FlexibleOffCard({ month: asked, onChanged }: { month: string; onChanged?: () => void }) {
  const [month, setMonth] = React.useState(asked);
  React.useEffect(() => { setMonth(asked); }, [asked]);
  const { data, busy, error, pick, giveBack } = useFlexibleOff(month, onChanged);
  const [date, setDate] = React.useState('');

  if (!data?.enabled) return null;
  const range = monthRange(data.month);
  const min = data.today > range.from ? data.today : range.from;
  const full = data.remaining <= 0;
  const add = async () => { if (date && (await pick(date))) setDate(''); };

  return (
    <section className="rounded-[var(--tt-radius-md)] border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarOff className="h-4 w-4 text-fg-muted" aria-hidden />
          <h2 className="text-sm font-extrabold text-fg">Flexible week off</h2>
          <span className="text-xs font-semibold text-fg-muted">{data.used} of {data.quota} used · {formatMonth(data.month)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(addMonths(data.month, -1))} className="h-7 rounded-lg border border-line px-2 text-xs font-semibold text-fg-muted hover:bg-bg-subtle">‹</button>
          <button type="button" aria-label="Next month" onClick={() => setMonth(addMonths(data.month, 1))} className="h-7 rounded-lg border border-line px-2 text-xs font-semibold text-fg-muted hover:bg-bg-subtle">›</button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {data.dates.length === 0 && <span className="text-xs text-fg-muted">No off days picked yet. Days you do not pick are working days.</span>}
        {data.dates.map((d) => (
          <span key={d} className="inline-flex h-7 items-center gap-1 rounded-lg border border-line bg-bg-subtle pl-2.5 pr-1 text-xs font-semibold text-fg">
            {formatDate(d, 'weekday')}
            {d >= data.today && (
              <button type="button" aria-label={`Remove ${formatDate(d)}`} disabled={busy} onClick={() => giveBack(d)} className="inline-flex h-5 w-5 items-center justify-center rounded text-fg-muted hover:text-fg disabled:opacity-40">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-start gap-2">
        <input
          type="date"
          aria-label="Off day"
          aria-invalid={!!error}
          value={date}
          min={min}
          max={range.to}
          disabled={busy || full}
          onChange={(e) => setDate(e.target.value)}
          className={cx(controlClass, 'w-auto', error && 'border-[var(--tt-danger)]')}
        />
        <button type="button" onClick={add} disabled={busy || full || !date} className="inline-flex h-9 items-center rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-50 sm:text-sm">
          Add off day
        </button>
        {full && <span className="self-center text-xs text-fg-muted">All off days for this month are used.</span>}
      </div>
      {error && <p role="alert" className="mt-1 text-xs font-semibold text-[var(--tt-danger)]">{error}</p>}
    </section>
  );
}
