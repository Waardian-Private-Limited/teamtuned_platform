'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Btn, Card, Skeleton } from '@/features/data-collection/components/shared/Ui';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import * as api from '../../api/tm.api';
import type { CalendarDay, Filters, Scope } from '../../types/tm.types';
import { ListView } from './ListView';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = (n: number) => String(n).padStart(2, '0');

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** Cells for a Monday-first month grid; null pads the first and last week. */
function cells(month: string): (string | null)[] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const out: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d += 1) out.push(`${month}-${pad(d)}`);
  while (out.length % 7) out.push(null);
  return out;
}

const monthLabel = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString([], { month: 'long', year: 'numeric' });
const dayLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

/** Month of due dates: a count under each day (overdue in red, a check when all done). Picking a day lists its tasks. */
export function CalendarView({ scope, filters, onOpen, version, onNewTask }: { scope: Scope; filters: Filters; onOpen: (id: number) => void; version: number; onNewTask?: (date: string) => void }) {
  const [month, setMonth] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const { data, loading, error } = useAsync(() => api.calendar(filters, scope, month || ''), [scope, JSON.stringify(filters), month, version]);
  const current = month || data?.month || null;
  const byDate = useMemo(() => new Map<string, CalendarDay>((data?.days || []).map((d) => [d.date, d])), [data]);
  const selected = picked || (data && current === data.today.slice(0, 7) ? data.today : null);
  const totals = (data?.days || []).reduce((a, d) => ({ total: a.total + d.total, overdue: a.overdue + d.overdue }), { total: 0, overdue: 0 });

  const go = (by: number) => { if (!current) return; setMonth(shiftMonth(current, by)); setPicked(null); };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="!p-3 sm:!p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-fg">{current ? monthLabel(current) : '…'}</h2>
            <p className="text-xs text-fg-muted">{totals.total} due this month{totals.overdue ? <span className="font-semibold text-[var(--tt-danger)]"> · {totals.overdue} overdue</span> : null}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Btn aria-label="Previous month" onClick={() => go(-1)} icon={<ChevronLeft className="h-4 w-4" />} />
            <Btn onClick={() => { setMonth(null); setPicked(null); }}>Today</Btn>
            <Btn aria-label="Next month" onClick={() => go(1)} icon={<ChevronRight className="h-4 w-4" />} />
          </div>
        </div>
        {error && <p className="mb-2 text-sm text-[var(--tt-danger)]">{error}</p>}
        {loading && !data ? <Skeleton className="h-72" /> : current && (
          <div role="grid" aria-label={monthLabel(current)}>
            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-fg-muted">{WEEK.map((w) => <div key={w}>{w}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {cells(current).map((date, i) => {
                if (!date) return <div key={`pad-${i}`} />;
                const d = byDate.get(date);
                const isToday = date === data?.today;
                const isPicked = date === selected;
                const allDone = d && d.total > 0 && d.done === d.total;
                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    aria-selected={isPicked}
                    aria-label={`${dayLabel(date)}${d ? `, ${d.total} due${d.overdue ? `, ${d.overdue} overdue` : ''}` : ', nothing due'}`}
                    onClick={() => setPicked(date)}
                    className={cx(
                      'flex aspect-square min-h-[2.75rem] flex-col items-center justify-between rounded-lg border p-1 text-xs transition-colors sm:aspect-auto sm:h-16',
                      isPicked ? 'border-fg bg-fg text-bg' : d ? 'border-line bg-surface hover:border-line-strong' : 'border-transparent hover:bg-bg-subtle',
                    )}
                  >
                    <span className={cx('self-start font-semibold tabular-nums', isToday && !isPicked && 'rounded bg-fg px-1 text-bg')}>{Number(date.slice(8))}</span>
                    {d && (
                      <span className="flex items-center gap-1 text-[10px] font-bold tabular-nums leading-none">
                        {allDone ? <span aria-hidden>✓ {d.total}</span> : <span>{d.open}</span>}
                        {d.overdue > 0 && <span className={cx('rounded px-1 py-0.5', isPicked ? 'bg-bg text-[var(--tt-danger)]' : 'bg-[var(--tt-danger)] text-white')}>{d.overdue}</span>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-muted">
              <span><b className="text-fg">3</b> still open that day</span>
              <span><span className="rounded bg-[var(--tt-danger)] px-1 font-bold text-white">2</span> overdue</span>
              <span>✓ all done</span>
            </p>
          </div>
        )}
      </Card>
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-fg">{selected ? dayLabel(selected) : 'Pick a day'}</h3>
            {selected && onNewTask && <Btn icon={<Plus className="h-4 w-4" />} onClick={() => onNewTask(selected)}>Task on this day</Btn>}
          </div>
          {selected ? <ListView scope={scope} filters={filters} dueOn={selected} onOpen={onOpen} version={version} /> : <Card><p className="text-sm text-fg-muted">Choose a date to see what is due.</p></Card>}
        </div>
        {scope === 'mine' && (
          <div>
            <h3 className="text-sm font-bold text-fg">No due date</h3>
            <p className="mb-2 text-xs text-fg-muted">Your tasks without a due date. They cannot sit on a day, so they wait here.</p>
            <ListView scope="mine" filters={{ ...filters, due: 'none' }} onOpen={onOpen} version={version} />
          </div>
        )}
      </div>
    </div>
  );
}
