'use client';

import Image from 'next/image';
import { AlertTriangle, CalendarClock, CheckCircle2, Hourglass, ListTodo, Timer } from 'lucide-react';
import { Bar, Card, PageHeader, Skeleton, Tile } from '@/features/data-collection/components/shared/Ui';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import * as api from '../api/tm.api';
import { duration } from '../constants/tm.constants';

export function DashboardPage({ basePath }: { basePath: string }) {
  const { data, loading, error } = useAsync(() => api.dashboard(), []);
  const t = data?.tiles;
  const worst = data?.people.reduce((m, p) => Math.max(m, p.open), 0) || 0;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <PageHeader title="Task dashboard" subtitle="Where work stands across your people." />
      {error && <p className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
        <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-[var(--tt-shadow-sm)]">
          <div>
            <div className="text-xs font-semibold text-fg-muted">On time, last 30 days</div>
            {loading && !t ? <Skeleton className="mt-2 h-12 w-28" /> : <div className="mt-1 text-5xl font-extrabold leading-none text-fg">{t?.on_time_rate === null || t?.on_time_rate === undefined ? '–' : `${t.on_time_rate}%`}</div>}
            <p className="mt-2 text-xs text-fg-muted">{t?.avg_cycle_seconds ? `Average ${duration(t.avg_cycle_seconds)} from assigned to done` : 'Finish some tasks to see this'}</p>
          </div>
          <div className="mt-4"><Bar value={Math.round(t?.on_time_rate || 0)} total={100} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {loading && !t ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />) : (<>
            <Tile icon={ListTodo} label="Open" value={t?.open ?? 0} />
            <Tile icon={AlertTriangle} label="Overdue" value={t?.overdue ?? 0} note="Past the due time" />
            <Tile icon={CalendarClock} label="Due today" value={t?.due_today ?? 0} />
            <Tile icon={Hourglass} label="In review" value={t?.in_review ?? 0} />
            <Tile icon={CheckCircle2} label="Done this week" value={t?.done_week ?? 0} />
            <Tile icon={Timer} label="Avg. cycle" value={t?.avg_cycle_seconds ? duration(t.avg_cycle_seconds) : '–'} note="Assigned to done" />
          </>)}
        </div>
      </div>

      <Card title="By person" subtitle="Most open work first" className="mt-4" action={<a href={`${basePath}/board`} className="text-xs font-semibold text-fg underline-offset-4 hover:underline">Open the board</a>}>
        {loading && !data ? <Skeleton className="h-40" /> : data && data.people.length > 0 ? (
          <ul className="space-y-3">{data.people.map((p) => (
            <li key={p.employee_id}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs"><span className="truncate font-semibold text-fg">{p.name}</span><span className="shrink-0 text-fg-muted">{p.open} open{p.overdue ? ` · ${p.overdue} overdue` : ''} · {p.done} done (30d)</span></div>
              <Bar value={p.open} total={worst} />
            </li>
          ))}</ul>
        ) : <div className="flex flex-col items-center py-6 text-center"><Image src="/vectors/attendancedashboard.svg" alt="" width={150} height={100} className="mb-2 h-auto max-h-24 w-auto opacity-80" /><p className="text-xs text-fg-muted">No tasks yet</p></div>}
      </Card>
    </div>
  );
}
