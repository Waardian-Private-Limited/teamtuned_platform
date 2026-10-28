'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, Clock, Coffee, LogIn, LogOut, Timer } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { formatDate, formatTime } from '@/lib/datetime';
import { minutesText } from '@/features/detailed-attendance/utils/format';
import type { SnapshotDto } from '../types/selfDashboard.dto';
import { todayState, type TodayState, type TodayTone } from '../utils/todayState';
import { DashCard } from './DashCard';

const DOT: Record<TodayTone, string> = {
  live: 'bg-[var(--tt-success)]',
  good: 'bg-[var(--tt-success)]',
  warn: 'bg-[var(--tt-warning)]',
  bad: 'bg-[var(--tt-danger)]',
  muted: 'bg-fg-subtle',
};

/** Minute-level card: tick every 15 s while a session runs, otherwise each minute (the late/ended lines move too). */
function useNow(live: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), live ? 15000 : 60000);
    return () => clearInterval(id);
  }, [live]);
  return now;
}

/** The ring colour, as on the app's shift card: done = green, full-day mark = soft green, half-day mark = amber, closed short = red, otherwise the neutral live colour. */
function ringColour(s: TodayState): string {
  if (s.band === 'complete') return 'var(--tt-success)';
  const verdict = s.verdict?.toLowerCase();
  if (verdict?.includes('half')) return 'var(--tt-warning)';
  if (verdict === 'absent') return 'var(--tt-danger)';
  if (s.band === 'fullDay') return 'color-mix(in srgb, var(--tt-success) 55%, transparent)';
  if (s.band === 'halfDay') return 'var(--tt-warning)';
  return s.inProgress ? 'var(--tt-fg)' : 'var(--tt-danger)';
}

function Ring({ state }: { state: TodayState }) {
  const { workedMinutes: worked, expectedMinutes: expected, marks } = state;
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = expected > 0 ? Math.min(1, worked / expected) : 0;
  return (
    <div className="relative h-24 w-24 shrink-0 sm:h-36 sm:w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" className="stroke-[var(--tt-bg-subtle)]" />
        <circle
          cx="60" cy="60" r={r} fill="none" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ stroke: ringColour(state) }}
          className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
        />
        {marks.map((f) => {
          const a = 2 * Math.PI * f;
          const x1 = 60 + (r - 6) * Math.cos(a);
          const y1 = 60 + (r - 6) * Math.sin(a);
          const x2 = 60 + (r + 6) * Math.cos(a);
          const y2 = 60 + (r + 6) * Math.sin(a);
          return <line key={f} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="2" className="stroke-[var(--tt-surface)]" />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base font-extrabold tabular-nums text-fg sm:text-2xl">{minutesText(worked)}</span>
        <span className="text-[11px] font-medium text-fg-muted">{expected > 0 ? `of ${minutesText(expected)}` : 'worked'}</span>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: string; tone?: 'bad' }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-line px-3 py-2.5">
      <Icon className="hidden h-4 w-4 shrink-0 text-fg-muted sm:block" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
        <p className={cx('truncate text-sm font-bold tabular-nums', tone === 'bad' ? 'text-[var(--tt-danger)]' : 'text-fg')}>{value}</p>
      </div>
    </div>
  );
}

export function TodayCard({ data, loading, error, onRetry }: { data: SnapshotDto | null; loading: boolean; error: string; onRetry: () => void }) {
  const now = useNow(!!data?.open_since);
  const s = data ? todayState(data, now) : null;
  const tz = data?.timezone;

  return (
    <DashCard
      title="Today"
      subtitle={data ? formatDate(data.date, 'weekday') : null}
      icon={CalendarCheck}
      href="/employee/my-attendance"
      hrefLabel="My attendance"
      loading={loading && !data}
      error={!data ? error : ''}
      onRetry={onRetry}
      className="h-full"
    >
      {s && (
        <div className="flex flex-col gap-5">
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
            <Ring state={s} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {s.tone === 'live' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--tt-success)] opacity-60" />}
                  <span className={cx('relative inline-flex h-2.5 w-2.5 rounded-full', DOT[s.tone])} />
                </span>
                <h3 className="text-base font-extrabold leading-snug text-fg sm:text-xl">{s.headline}</h3>
              </div>
              {s.detail && <p className="mt-1 text-xs text-fg-muted sm:text-sm">{s.detail}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-line bg-bg-subtle px-2.5 py-0.5 text-[11px] font-semibold text-fg">
                  <Clock className="h-3 w-3" aria-hidden />
                  {s.shiftText}
                </span>
                {s.lateMinutes > 0 && (
                  <span className="inline-flex items-center rounded-full border border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--tt-danger)]">
                    Late by {minutesText(s.lateMinutes)}
                  </span>
                )}
                {s.onBreak && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle px-2.5 py-0.5 text-[11px] font-semibold text-fg">
                    <Coffee className="h-3 w-3" aria-hidden />
                    On break
                  </span>
                )}
                {s.reviewPending && (
                  <span className="inline-flex items-center rounded-full border border-line bg-bg-subtle px-2.5 py-0.5 text-[11px] font-semibold text-fg-muted">Under review</span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Fact icon={LogIn} label="In" value={s.inAt ? formatTime(s.inAt, tz) : '—'} tone={s.lateMinutes > 0 ? 'bad' : undefined} />
            <Fact icon={LogOut} label="Out" value={s.outAt ? formatTime(s.outAt, tz) : '—'} />
            <Fact icon={Timer} label="Ends" value={s.expectedEndAt ? formatTime(s.expectedEndAt, tz) : '—'} />
          </div>
        </div>
      )}
    </DashCard>
  );
}
