'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { useMonth } from '../../hooks/useMonth';
import { monthText, shiftMonth, daysText } from '../../utils/format';
import { Avatar, IconButton, Skeleton } from './controls';
import { MonthCalendar } from './MonthCalendar';
import { MonthSummaryTiles } from './MonthSummaryTiles';

interface Props {
  employeeId: number | null;
  startMonth: string;
  /** While a day is open on top, Escape closes only that. */
  childOpen: boolean;
  reloadKey: number;
  onClose: () => void;
  onOpenDay: (employeeId: number, date: string) => void;
}

function MonthSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <div className="hidden grid-cols-7 gap-1.5 sm:grid">{Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)}</div>
      <div className="space-y-2 sm:hidden">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
    </div>
  );
}

/** One employee's month: totals, the calendar, and leave balances. */
export function MonthDialog({ employeeId, startMonth, childOpen, reloadKey, onClose, onOpenDay }: Props) {
  const m = useMonth(employeeId, startMonth, reloadKey);
  if (employeeId === null) return null;
  const data = m.data;
  const thisMonth = data ? data.today.slice(0, 7) : null;
  return (
    <Dialog
      open
      onClose={childOpen ? () => undefined : onClose}
      maxWidthClassName="max-w-5xl"
      title={
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={data?.employee.name || ' '} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-fg">{data ? data.employee.name : 'Monthly attendance'}</h2>
            <p className="truncate text-xs text-fg-muted">{data ? [data.employee.code, data.employee.department, data.employee.role].filter(Boolean).join(' · ') : ' '}</p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <IconButton label="Previous month" onClick={() => m.setMonth(shiftMonth(m.month, -1))}><ChevronLeft className="h-4 w-4" /></IconButton>
            <h3 className="min-w-[10.5rem] text-center text-base font-extrabold text-fg">{monthText(m.month)}</h3>
            <IconButton label="Next month" onClick={() => m.setMonth(shiftMonth(m.month, 1))} disabled={!thisMonth || m.month >= thisMonth}><ChevronRight className="h-4 w-4" /></IconButton>
          </div>
          {thisMonth && m.month !== thisMonth && (
            <button type="button" onClick={() => m.setMonth(thisMonth)} className="h-8 rounded-lg border border-line px-3 text-xs font-bold text-fg hover:bg-bg-subtle">This month</button>
          )}
        </div>

        {m.error && <Alert message={m.error} />}
        {m.loading || !data ? <MonthSkeleton /> : (
          <div className={m.refreshing ? 'space-y-5 opacity-60 transition-opacity' : 'space-y-5 transition-opacity'}>
            <MonthSummaryTiles month={data} />
            {data.summary.consecutiveAbsence && (
              <p className="rounded-lg border border-line bg-bg-subtle/60 px-3 py-2 text-xs text-fg-muted">{data.summary.consecutiveAbsence.days} absent days in a row, the policy flags this.</p>
            )}
            <MonthCalendar cells={data.cells} today={data.today} onOpen={(date) => onOpenDay(data.employee.id, date)} />
            {data.leaveBalances.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Leave balances</h3>
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {data.leaveBalances.map((b) => (
                    <li key={b.code} className="rounded-xl border border-line p-3">
                      <p className="truncate text-xs font-semibold text-fg-muted">{b.name}</p>
                      <p className="mt-1 text-xl font-extrabold tabular-nums text-fg">{daysText(b.available)}</p>
                      <p className="truncate text-[11px] text-fg-muted">{b.used ? `${daysText(b.used)} used of ${daysText(b.credited)}` : `of ${daysText(b.credited)}`}{b.pending ? ` · ${daysText(b.pending)} pending` : ''}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
