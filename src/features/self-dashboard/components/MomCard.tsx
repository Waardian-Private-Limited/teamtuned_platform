'use client';

import Link from 'next/link';
import { CalendarClock, Users } from 'lucide-react';
import { formatDayTime } from '@/lib/datetime';
import type { MyWork } from '../api/selfDashboard.api';
import { DashCard, EmptyLine, Stat } from './DashCard';

const BASE = '/employee/mom';

/** My meeting actions in numbers (zero included) and my next meeting. The numbers come from the dashboard's one /me/work read. */
export function MomCard({ counts, tz, loading, error, onRetry }: { counts: MyWork['mom']; tz?: string | null; loading: boolean; error: string; onRetry: () => void }) {
  const c = counts;
  const next = c?.next_meeting;
  return (
    <DashCard
      title="Minutes of meeting"
      subtitle={c ? (c.open + c.signoff === 0 ? 'All caught up' : `${c.open + c.signoff} need you`) : null}
      icon={Users}
      href={BASE}
      loading={loading && !c}
      error={!c ? error : ''}
      onRetry={onRetry}
    >
      {c && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Open" value={c.open} href={BASE} />
            <Stat label="Overdue" value={c.overdue} tone={c.overdue > 0 ? 'bad' : undefined} href={BASE} />
            <Stat label="This week" value={c.week} href={BASE} />
            <Stat label="To sign off" value={c.signoff} href={BASE} />
          </div>
          {next ? (
            <Link href={`${BASE}/meetings/${next.id}`} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 transition-colors hover:border-line-strong">
              <CalendarClock className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-fg">{next.title}</span>
                <span className="block truncate text-xs text-fg-muted">{next.status === 'live' ? 'Live now' : formatDayTime(next.starts_at, tz)}{next.place ? ` · ${next.place}` : ''}</span>
              </span>
            </Link>
          ) : (
            <EmptyLine icon={CalendarClock} title="No meetings in the next 7 days" />
          )}
        </div>
      )}
    </DashCard>
  );
}
