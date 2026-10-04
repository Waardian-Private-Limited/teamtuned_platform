'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { myHolidays } from '../api/holidays.api';
import { SESSION_LABEL } from '../constants';
import type { MyHoliday } from '../types/holidays';
import { HolidaysEmptyState } from './HolidaysEmptyState';

// Employee view: only the holidays that apply to them (their sub-organization and sites).
export function MyHolidays({ compact = false }: { compact?: boolean }) {
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [rows, setRows] = React.useState<MyHoliday[] | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setRows(null);
    myHolidays(year).then((r) => setRows(r.holidays)).catch((e) => setError(messageOf(e)));
  }, [year]);

  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {!compact && (
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
          <h1 className="text-lg font-bold tracking-tight text-fg">Holidays</h1>
          <div className="flex items-center rounded-lg border border-line">
            <button type="button" aria-label="Previous year" onClick={() => setYear(year - 1)} className="grid h-8 w-8 place-items-center hover:bg-bg-subtle"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-14 text-center text-sm font-semibold">{year}</span>
            <button type="button" aria-label="Next year" onClick={() => setYear(year + 1)} className="grid h-8 w-8 place-items-center hover:bg-bg-subtle"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">
        {error && <div className="p-3"><Alert message={error} tone="error" /></div>}
        {rows === null ? (
          <div className="h-40 animate-pulse bg-bg-subtle/60" />
        ) : rows.length === 0 ? (
          <HolidaysEmptyState year={year} filtered={false} canAdd={false} onAdd={() => undefined} onClear={() => undefined} />
        ) : (
          <ul className="divide-y divide-line overflow-y-auto">
            {rows.map((h) => (
              <li key={`${h.id}-${h.date}`} className={`flex items-center justify-between gap-3 px-4 py-3 ${h.date < today ? 'opacity-55' : ''}`}>
                <div>
                  <p className="text-sm font-semibold text-fg">{h.name}{h.is_optional && <span className="ml-2 rounded-md border border-dashed border-line px-1.5 py-0.5 text-[10px] text-fg-muted">Optional</span>}</p>
                  <p className="text-xs text-fg-muted">{new Date(`${h.date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</p>
                </div>
                {h.session !== 'full' && <span className="rounded-full border border-[var(--tt-primary)] px-2.5 py-1 text-xs font-medium text-fg">{SESSION_LABEL[h.session]}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
