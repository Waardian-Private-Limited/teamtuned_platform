'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { useMonth } from '../hooks/useMonth';
import { monthText, shiftMonth } from '../utils/format';
import { DayPopup } from './DayPopup';
import { BalancesPanel } from './components/BalancesPanel';
import { Avatar, IconButton, Skeleton } from './components/controls';
import { MonthCalendar } from './components/MonthCalendar';
import { MonthSummaryTiles } from './components/MonthSummaryTiles';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

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

/**
 * One employee's month as a page of its own (the link is shareable and survives a refresh): the
 * payroll totals, the calendar and the leave and comp-off balances. A tap on a day opens that
 * day with every check-in, map and selfie, and the override.
 */
export function EmployeeMonthPage({ listPath }: { listPath: string }) {
  const params = useParams<{ employeeId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const employeeId = Number(params.employeeId);
  const asked = search.get('month') || '';
  const [version, setVersion] = React.useState(0);
  const [day, setDay] = React.useState<string | null>(null);
  const m = useMonth(Number.isFinite(employeeId) ? employeeId : null, MONTH.test(asked) ? asked : '', version);
  const data = m.data;
  const thisMonth = data ? data.today.slice(0, 7) : null;

  const go = (month: string) => {
    m.setMonth(month);
    router.replace(`${pathname}?month=${month}`, { scroll: false });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <Link href={listPath} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Detailed attendance</Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={data?.employee.name || ' '} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold text-fg sm:text-2xl">{data ? data.employee.name : 'Monthly attendance'}</h1>
            <p className="truncate text-sm text-fg-muted">{data ? [data.employee.code, data.employee.department, data.employee.role].filter(Boolean).join(' · ') : ' '}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton label="Previous month" onClick={() => go(shiftMonth(data ? data.month : '', -1))} disabled={!data}><ChevronLeft className="h-4 w-4" /></IconButton>
          <h2 className="min-w-[10.5rem] text-center text-base font-extrabold text-fg">{data ? monthText(data.month) : ' '}</h2>
          <IconButton label="Next month" onClick={() => go(shiftMonth(data ? data.month : '', 1))} disabled={!data || !thisMonth || data.month >= thisMonth}><ChevronRight className="h-4 w-4" /></IconButton>
          {thisMonth && data && data.month !== thisMonth && (
            <button type="button" onClick={() => go(thisMonth)} className="ml-1 h-8 rounded-lg border border-line px-3 text-xs font-bold text-fg hover:bg-bg-subtle">This month</button>
          )}
        </div>
      </header>

      {m.error && <Alert message={m.error} />}
      {m.loading || !data ? (m.error ? null : <PageSkeleton />) : (
        <div className={m.refreshing ? 'space-y-5 opacity-60 transition-opacity' : 'space-y-5 transition-opacity'}>
          <MonthSummaryTiles month={data} />
          {data.summary.consecutiveAbsence && (
            <p className="rounded-lg border border-line bg-bg-subtle/60 px-3 py-2 text-xs text-fg-muted">{data.summary.consecutiveAbsence.days} absent days in a row, the policy flags this.</p>
          )}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <MonthCalendar cells={data.cells} today={data.today} onOpen={setDay} />
            <BalancesPanel balances={data.balances} />
          </div>
          <p className="text-xs text-fg-muted">Times are shown in {data.timezone}.</p>
        </div>
      )}

      <DayPopup employeeId={day && data ? data.employee.id : null} date={day} reloadKey={version}
        onClose={() => setDay(null)} onChanged={() => setVersion((v) => v + 1)} />
    </div>
  );
}
