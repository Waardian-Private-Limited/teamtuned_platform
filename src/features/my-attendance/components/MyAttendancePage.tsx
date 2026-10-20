'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Avatar } from '@/features/detailed-attendance/components/components/controls';
import { MonthBody, MonthNav } from '@/features/detailed-attendance/components/components/MonthBody';
import { CalendarRange } from 'lucide-react';
import { MyRostersDrawer } from '@/features/my-roster/components/MyRostersDrawer';
import { useMyMonth } from '../hooks/useMyMonth';
import { FlexibleOffCard } from './FlexibleOffCard';
import { MyDayDialog } from './MyDayDialog';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/;

/**
 * The signed-in employee's own monthly attendance: the totals, the calendar and the balances, and a
 * tap on a day opens it with Regularize. The page has no employee in its address and asks only the
 * "me" endpoints, so there is no way to point it at anyone else.
 */
export function MyAttendancePage() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const asked = search.get('month') || '';
  const [version, setVersion] = React.useState(0);
  // ?date=yyyy-MM-dd opens that day straight away (links from the dashboard).
  const [day, setDay] = React.useState<string | null>(() => (DATE.test(search.get('date') || '') ? search.get('date') : null));
  const [rosters, setRosters] = React.useState(false);
  const m = useMyMonth(MONTH.test(asked) ? asked : '', version);
  const data = m.data;

  const go = (month: string) => {
    m.setMonth(month);
    router.replace(`${pathname}?month=${month}`, { scroll: false });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={data?.employee.name || ' '} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold text-fg sm:text-2xl">My attendance</h1>
            <p className="truncate text-sm text-fg-muted">{data ? [data.employee.name, data.employee.code, data.employee.department].filter(Boolean).join(' · ') : ' '}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Only when the policy times this employee's days by roster. */}
          {data?.rosterEnabled && (
            <button type="button" onClick={() => setRosters(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-bold text-fg hover:bg-bg-subtle">
              <CalendarRange className="h-4 w-4" /> My rosters
            </button>
          )}
          <MonthNav data={data} onGo={go} />
        </div>
      </header>

      <FlexibleOffCard month={m.month} onChanged={() => setVersion((v) => v + 1)} />

      <MonthBody data={data} error={m.error} loading={m.loading} refreshing={m.refreshing} onOpenDay={setDay} />

      <MyRostersDrawer open={rosters} onClose={() => setRosters(false)} />

      <MyDayDialog date={day} roster={data?.cells.find((c) => c.date === day)?.schedule} reloadKey={version} onClose={() => setDay(null)} onChanged={() => setVersion((v) => v + 1)} />
    </div>
  );
}
