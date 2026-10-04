'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import * as api from '../api/leave.api';
import type { CalendarResponse } from '../types/leave';

// Who is off, by day, with holidays: the month at a glance.
export function CalendarTab({ refreshKey }: { refreshKey: number }) {
  const now = new Date();
  const [cursor, setCursor] = React.useState({ y: now.getFullYear(), m: now.getMonth() });
  const [data, setData] = React.useState<CalendarResponse | null>(null);
  const [error, setError] = React.useState('');

  const first = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-01`;
  const last = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(new Date(cursor.y, cursor.m + 1, 0).getDate()).padStart(2, '0')}`;
  React.useEffect(() => { setData(null); api.calendar({ from: first, to: last }).then(setData).catch((e) => setError(messageOf(e))); }, [first, last, refreshKey]);

  const lead = new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay();
  const dim = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const move = (d: number) => setCursor((c) => { const t = new Date(c.y, c.m + d, 1); return { y: t.getFullYear(), m: t.getMonth() }; });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line p-3">
        <p className="text-sm font-bold text-fg">{new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous month" onClick={() => move(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line hover:bg-bg-subtle"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="Next month" onClick={() => move(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line hover:bg-bg-subtle"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      {error && <div className="p-3"><Alert message={error} tone="error" /></div>}
      <div className="grid min-h-0 flex-1 grid-cols-7 overflow-auto">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="sticky top-0 border-b border-line bg-bg-subtle px-2 py-1.5 text-xs font-semibold text-fg-muted">{d}</div>)}
        {Array.from({ length: lead }).map((_, i) => <div key={`l${i}`} className="border-b border-r border-line" />)}
        {Array.from({ length: dim }, (_, i) => i + 1).map((d) => {
          const date = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const people = new Map<number, { name: string; pending: boolean }>();
          for (const l of data?.leaves ?? []) if (l.date === date) {
            people.set(l.employee_id, { name: l.employee_name, pending: l.status === 'Pending' });
          }
          const slotsByPerson = (id: number) => (data?.leaves ?? []).filter((l) => l.date === date && l.employee_id === id).length;
          const hol = (data?.holidays ?? []).filter((h) => h.date === date);
          const list = [...people.entries()];
          return (
            <div key={d} className="min-h-24 border-b border-r border-line p-1.5">
              <p className="text-xs font-semibold text-fg-muted">{d}</p>
              {hol.map((h) => <p key={h.id} className="mt-0.5 truncate rounded bg-[var(--tt-primary)] px-1 text-[10px] font-semibold text-[var(--tt-on-primary)]">{h.name}{h.session !== 'full' ? ' (½)' : ''}</p>)}
              {list.slice(0, 3).map(([id, p]) => (
                <p key={id} className={cx('mt-0.5 truncate rounded border px-1 text-[10px]', p.pending ? 'border-dashed border-line-strong text-fg-muted' : 'border-line text-fg')}>{p.name}{slotsByPerson(id) === 1 ? ' (½)' : ''}</p>
              ))}
              {list.length > 3 && <p className="mt-0.5 text-[10px] text-fg-muted">+{list.length - 3} more</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
