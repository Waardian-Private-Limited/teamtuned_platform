import React from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import type { Month } from '../../types/detailed.model';
import { monthText, shiftMonth } from '../../utils/format';
import { BalancesPanel } from './BalancesPanel';
import { CompOffGrantsList } from './CompOffGrantsList';
import { IconButton, Skeleton } from './controls';
import { MonthCalendar } from './MonthCalendar';
import { MonthSummaryTiles } from './MonthSummaryTiles';

function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div className="hidden grid-cols-7 gap-1.5 sm:grid">{Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)}</div>
          <div className="space-y-2 sm:hidden">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        </div>
        <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      </div>
    </div>
  );
}

/** Previous and next month with the month's name, and a way back to this month. */
export function MonthNav({ data, onGo }: { data: Month | null; onGo: (month: string) => void }) {
  const thisMonth = data ? data.today.slice(0, 7) : null;
  return (
    <div className="flex items-center gap-1.5">
      <IconButton label="Previous month" onClick={() => onGo(shiftMonth(data ? data.month : '', -1))} disabled={!data}><ChevronLeft className="h-4 w-4" /></IconButton>
      <h2 className="min-w-[10.5rem] text-center text-base font-extrabold text-fg">{data ? monthText(data.month) : ' '}</h2>
      <IconButton label="Next month" onClick={() => onGo(shiftMonth(data ? data.month : '', 1))} disabled={!data || !thisMonth || data.month >= thisMonth}><ChevronRight className="h-4 w-4" /></IconButton>
      {thisMonth && data && data.month !== thisMonth && (
        <button type="button" onClick={() => onGo(thisMonth)} className="ml-1 h-8 rounded-lg border border-line px-3 text-xs font-bold text-fg hover:bg-bg-subtle">This month</button>
      )}
    </div>
  );
}

/** One employee's month under its header: totals, calendar, balances and comp-off. A tap on a day calls `onOpenDay`. */
export function MonthBody({ data, error, loading, refreshing, onOpenDay }: { data: Month | null; error: string | null; loading: boolean; refreshing: boolean; onOpenDay: (date: string) => void }) {
  return (
    <>
      {error && <Alert message={error} />}
      {loading || !data ? (error ? null : <PageSkeleton />) : (
        <div className={refreshing ? 'space-y-5 opacity-60 transition-opacity' : 'space-y-5 transition-opacity'}>
          <MonthSummaryTiles month={data} />
          {data.summary.notJoined && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              Employee has not joined yet during this cycle{data.employee.joiningDate ? ` (Joining date: ${data.employee.joiningDate})` : ''}. Attendance and payable days are not evaluated.
            </p>
          )}
          {data.summary.consecutiveAbsence && (
            <p className="rounded-lg border border-line bg-bg-subtle/60 px-3 py-2 text-xs text-fg-muted">{data.summary.consecutiveAbsence.days} absent days in a row, the policy flags this.</p>
          )}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
            <MonthCalendar cells={data.cells || []} today={data.today || ''} onOpen={onOpenDay} />
            <div className="space-y-4">
              <BalancesPanel balances={data.balances || []} />

              {(() => {
                const compOffGrants = data.compOffGrants || (data.balances || []).find((b) => b.kind === 'comp_off')?.grants || [];
                if (compOffGrants.length === 0) return null;
                const pendingGrantsCount = compOffGrants.filter((g) => g.state === 'pending').length;

                return (
                  <section aria-label="Comp-off grants" className="overflow-hidden rounded-xl border border-line bg-surface">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-fg-muted">Comp-off grants</h3>
                      {pendingGrantsCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                          {pendingGrantsCount} pending
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <CompOffGrantsList
                        grants={compOffGrants}
                        title=""
                        defaultExpandedFirst={false}
                      />
                    </div>
                  </section>
                );
              })()}
            </div>
          </div>

          <p className="text-xs text-fg-muted">Times are shown in {data.timezone}.</p>
        </div>
      )}

    </>
  );
}
