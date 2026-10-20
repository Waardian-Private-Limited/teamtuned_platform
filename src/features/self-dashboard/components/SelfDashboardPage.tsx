'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CalendarCheck, TreePalm, UserRound } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { orgNowMinutes, orgToday } from '@/lib/datetime';
import { toMonth } from '@/features/detailed-attendance/types/detailed.mapper';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { DC_FEATURE } from '@/features/data-collection/constants/dc.constants';
import { TM_FEATURE } from '@/features/task-management/constants/tm.constants';
import * as api from '../api/selfDashboard.api';
import { CycleCard } from './CycleCard';
import { FormsCard } from './FormsCard';
import { PayslipCard } from './PayslipCard';
import { RequestsCard } from './RequestsCard';
import { TasksCard } from './TasksCard';
import { TodayCard } from './TodayCard';
import { WeekCard } from './WeekCard';

// Back on the tab after a while: the day has moved on, so read today again (at most this often).
const STALE_MS = 2 * 60 * 1000;
const PAYROLL_FEATURE = 'PAYROLL_FEATURE';

function greeting(tz?: string | null) {
  const h = Math.floor(orgNowMinutes(tz) / 60);
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const QUICK = [
  { href: '/employee/my-attendance', label: 'My attendance', icon: CalendarCheck },
  { href: '/employee/leave', label: 'Apply leave', icon: TreePalm },
  { href: '/employee/my-profile', label: 'My profile', icon: UserRound },
];

export function SelfDashboardPage() {
  const { user, organization } = useAuth();
  const tz = organization?.timezone;
  const features = useMemo(() => new Set((organization?.organization_features || []).map((f) => f.code)), [organization]);
  const snapshot = useAsync(() => api.getSnapshot(), []);
  const cycle = useAsync(() => api.getCycle(), []);
  const month = useMemo(() => (cycle.data ? toMonth(cycle.data) : null), [cycle.data]);
  const today = orgToday(tz);

  const { refetch: refetchSnapshot } = snapshot;
  useEffect(() => {
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < STALE_MS) return;
      last = Date.now();
      void refetchSnapshot();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refetchSnapshot]);

  const showTasks = features.has(TM_FEATURE);
  const showForms = features.has(DC_FEATURE);
  const showPay = features.has(PAYROLL_FEATURE);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg-muted">{greeting(tz)}</p>
          <h1 className="truncate text-2xl font-extrabold text-fg sm:text-3xl">{user?.first_name || 'Welcome back'}</h1>
        </div>
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0" aria-label="Quick links">
          {QUICK.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:border-line-strong sm:text-sm">
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <TodayCard data={snapshot.data} loading={snapshot.loading} error={snapshot.error} onRetry={() => void snapshot.refetch()} />
      <CycleCard month={month} period={cycle.data?.period || null} loading={cycle.loading} error={cycle.error} onRetry={() => void cycle.refetch()} />

      {/* Work waiting on me comes before the reference cards below it. */}
      {(showTasks || showForms) && (
        <div className={showTasks && showForms ? 'grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2' : 'grid grid-cols-1'}>
          {showTasks && <TasksCard today={today} />}
          {showForms && <FormsCard />}
        </div>
      )}

      <div className={showPay ? 'grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3' : 'grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2'}>
        <WeekCard />
        <RequestsCard today={today} tz={tz} />
        {showPay && <div className="flex lg:col-span-2 xl:col-span-1 [&>section]:flex-1"><PayslipCard year={Number(today.slice(0, 4))} /></div>}
      </div>
    </div>
  );
}
