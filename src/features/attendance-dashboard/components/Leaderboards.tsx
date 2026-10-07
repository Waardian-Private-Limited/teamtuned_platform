'use client';

import { AlarmClock, Award, CalendarCheck, ChevronRight, Clock4, Hourglass, Sunrise } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cx } from '@/theme/tokens';
import { BOARDS, dayText, leaderValueText, PERIOD_LABEL } from '../constants/dashboard.constants';
import type { LeaderBoardDto, LeaderBoardKey, LeaderPeriod, LeadersDto } from '../types/dashboard.dto';
import { Avatar } from './Avatar';
import { Card, Skeleton } from './Card';

const ICON: Record<LeaderBoardKey, LucideIcon> = {
  early_birds: Sunrise,
  late_comers: AlarmClock,
  most_punctual: Award,
  best_attendance: CalendarCheck,
  most_hours: Clock4,
  most_overtime: Hourglass,
};

const rangeText = (d: LeadersDto) => (d.from === d.to ? dayText(d.to) : `${dayText(d.from)} – ${dayText(d.to)}`);

function Board({ board, period, onOpen }: { board: LeaderBoardDto; period: LeaderPeriod; onOpen: () => void }) {
  const meta = BOARDS[board.key];
  const Icon = ICON[board.key];
  return (
    <button type="button" onClick={onOpen} aria-label={`${meta.title}: see all ${board.total}`}
      className="group flex min-w-0 flex-col rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-[var(--tt-primary)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle" style={{ color: meta.tone }}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-fg">{meta.title}</p>
          <p className="truncate text-xs text-fg-muted">{meta.measure(period)}</p>
        </div>
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
      </div>
      {board.entries.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-6 text-center text-xs text-fg-muted">No one yet</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {board.entries.map((e) => (
            <li key={e.employee_id} className="flex min-w-0 items-center gap-2.5">
              <span className={cx('w-5 shrink-0 text-center text-xs font-extrabold tabular-nums', e.rank === 1 ? 'text-fg' : 'text-fg-muted')}>{e.rank}</span>
              <Avatar src={e.photo_url} size={8} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{e.name || e.employee_code || '—'}</p>
                <p className="truncate text-[11px] text-fg-muted">{meta.detail(e, period) || e.employee_code || ''}</p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-fg">{leaderValueText(e)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 border-t border-line pt-2 text-xs font-semibold text-fg-muted group-hover:text-fg">
        {board.total > board.entries.length ? `See all ${board.total}` : board.total ? 'Open as a table' : 'Nothing to rank'}
      </p>
    </button>
  );
}

/** Early birds, late comers and the week's and month's best, each opening its full ranking. */
export function Leaderboards({ data, period, onPeriod, loading, onOpen }: { data: LeadersDto | null; period: LeaderPeriod; onPeriod: (p: LeaderPeriod) => void; loading: boolean; onOpen: (b: LeaderBoardKey) => void }) {
  const options = (['day', 'week', 'month'] as const).map((p) => ({ value: p, label: PERIOD_LABEL[p] }));
  return (
    <Card title="Leaderboards" subtitle={data && !loading ? rangeText(data) : 'Loading…'}
      action={<SegmentedControl options={options} value={period} onChange={onPeriod} fitText />}>
      {loading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: period === 'day' ? 4 : 6 }).map((_, i) => <Skeleton key={i} className="h-[264px] rounded-xl" />)}</div>
      ) : (
        <div className={cx('grid gap-3 sm:grid-cols-2', data.boards.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3')}>
          {data.boards.map((b) => <Board key={b.key} board={b} period={data.period} onOpen={() => onOpen(b.key)} />)}
        </div>
      )}
    </Card>
  );
}
