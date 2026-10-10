'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useMonth } from '../hooks/useMonth';
import { DayPopup } from './DayPopup';
import { Avatar } from './components/controls';
import { MonthBody, MonthNav } from './components/MonthBody';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

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
        <MonthNav data={data} onGo={go} />
      </header>

      <MonthBody data={data} error={m.error} loading={m.loading} refreshing={m.refreshing} onOpenDay={setDay} />

      <DayPopup employeeId={day && data ? data.employee.id : null} date={day} reloadKey={version}
        onClose={() => setDay(null)} onChanged={() => setVersion((v) => v + 1)} />
    </div>
  );
}
