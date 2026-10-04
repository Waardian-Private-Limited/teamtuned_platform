'use client';

import { useState } from 'react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Button } from '@/components/ui/Button';
import { heading, text } from '@/theme/tokens';
import type { ScheduleDay } from '../../types/roster.types';
import { useMyRoster } from '../../hooks/useMyRoster';
import { clockOf } from '../../utils/rosterTime';
import { wallMinutes, nowWall } from '../../utils/myRosterUtils';
import { MonthHeader } from './components/MonthHeader';
import { WeekSummary } from './components/WeekSummary';
import { MonthGrid } from './components/MonthGrid';
import { AgendaList } from './components/AgendaList';
import { DayDrawer } from './components/DayDrawer';
import { AvailabilityPanel } from './components/AvailabilityPanel';

type Tab = 'schedule' | 'availability';

export function MyRosterPage() {
  const r = useMyRoster();
  const [tab, setTab] = useState<Tab>('schedule');
  const [selected, setSelected] = useState<ScheduleDay | null>(null);

  const canAct = selected?.start_at ? wallMinutes(selected.start_at) > nowWall() : false;
  const live = selected ? (r.byDate.get(selected.work_date) || []).find((d) => d.id === selected.id) || selected : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={heading.md}>My roster</h1>
          <p className={text.body}>Your published shifts, time off and availability.</p>
        </div>
        <SegmentedControl
          options={[{ value: 'schedule', label: 'Schedule' }, { value: 'availability', label: 'Availability' }]}
          value={tab}
          onChange={setTab}
          className="w-full sm:w-64"
        />
      </div>

      {tab === 'availability' ? (
        <AvailabilityPanel />
      ) : (
        <>
          <WeekSummary shifts={r.week.shifts} minutes={r.week.minutes} nextShift={r.nextShift} />
          <MonthHeader year={r.cursor.year} month={r.cursor.month} onPrev={r.prev} onNext={r.next} onToday={r.goToday} />
          {r.loading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : r.error ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--tt-danger)]">{r.error}</p>
              <Button variant="secondary" className="!h-9 !w-auto !px-3 !text-[13px]" onClick={() => void r.reload()}>Try again</Button>
            </div>
          ) : (
            <>
              {!r.hasAnyRows && (
                <EmptyState compact title="Nothing published yet" description="Your manager hasn't published a roster for this period." />
              )}
              <MonthGrid
                from={r.gridRange.from}
                to={r.gridRange.to}
                monthFrom={r.gridRange.monthFrom}
                monthTo={r.gridRange.monthTo}
                today={r.today}
                byDate={r.byDate}
                holidays={r.holidays}
                onSelect={setSelected}
              />
              <AgendaList
                monthFrom={r.gridRange.monthFrom}
                monthTo={r.gridRange.monthTo}
                today={r.today}
                byDate={r.byDate}
                holidays={r.holidays}
                onSelect={setSelected}
              />
            </>
          )}
        </>
      )}

      <DayDrawer
        day={live}
        pending={live ? r.pendingFor(live) : null}
        canAct={canAct && Boolean(clockOf(live?.start_at ?? null))}
        onClose={() => setSelected(null)}
        onSubmit={r.submitSwap}
        onCancelRequest={r.cancelRequest}
      />
    </div>
  );
}
