'use client';

import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Drawer } from '@/components/ui/Drawer';
import { formatDate } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { Skeleton } from '@/features/detailed-attendance/components/components/controls';
import { dayText } from '@/features/detailed-attendance/utils/format';
import { useMyRoster, useMyRosters } from '../hooks/useMyRosters';
import type { MyRoster, RosterSlot } from '../types/roster.model';
import { periodText, plannedText, STATE_LABEL, slotTimes, slotTitle } from '../utils/rosterText';
import { RosterSlotCard } from './RosterSlotCard';

const STATE_TONE: Record<MyRoster['state'], string> = {
  current: 'border-[var(--tt-success)]/40 bg-[var(--tt-success-soft)] text-[var(--tt-success)]',
  upcoming: 'border-fg/40 bg-surface text-fg',
  past: 'border-line bg-bg-subtle text-fg-muted',
};

function StateBadge({ state }: { state: MyRoster['state'] }) {
  return <span className={cx('rounded border px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide', STATE_TONE[state])}>{STATE_LABEL[state]}</span>;
}

function RosterCard({ r, onOpen }: { r: MyRoster; onOpen: () => void }) {
  const stats: Array<[string, string]> = [[`${r.shifts}`, 'Shifts'], [`${r.offs}`, 'Offs'], [`${r.leaves}`, 'Leave'], [plannedText(r.plannedMinutes), 'Planned']];
  return (
    <button type="button" onClick={onOpen} className="w-full rounded-lg border border-line bg-surface p-3 text-left transition-colors hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-[var(--tt-primary)]">
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-sm font-extrabold text-fg">{periodText(r.periodStart, r.periodEnd)}</span>
          {r.team && <span className="block truncate text-xs text-fg-muted">{r.team}</span>}
        </span>
        <StateBadge state={r.state} />
      </span>
      <span className="mt-2 grid grid-cols-4 gap-2 rounded border border-line bg-bg-subtle/40 px-3 py-2">
        {stats.map(([v, l]) => (
          <span key={l} className="min-w-0">
            <span className="block text-sm font-extrabold tabular-nums text-fg">{v}</span>
            <span className="block truncate text-[11px] text-fg-muted">{l}</span>
          </span>
        ))}
      </span>
      <span className="mt-2 flex items-center justify-between text-[11px] text-fg-muted">
        <span>{[r.publishedAt ? `Published ${formatDate(r.publishedAt.slice(0, 10), 'short')}` : null, r.version ? `Version ${r.version}` : null].filter(Boolean).join(' · ')}</span>
        <span className="inline-flex items-center gap-0.5 font-bold text-fg">View days <ChevronRight className="h-3.5 w-3.5" /></span>
      </span>
    </button>
  );
}

function RosterList({ onOpen }: { onOpen: (r: MyRoster) => void }) {
  const list = useMyRosters(true);
  if (list.error && !list.items.length) return <Alert message={list.error} />;
  if (list.loading && !list.items.length) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  if (!list.items.length) {
    return <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-fg-muted">No rosters yet. Rosters you are on show here once they are published.</p>;
  }
  return (
    <div className="space-y-2">
      {list.items.map((r, i) => {
        const active = r.state !== 'past';
        const starts = i === 0 || (list.items[i - 1].state !== 'past') !== active;
        return (
          <React.Fragment key={r.id}>
            {starts && <h3 className={cx('text-[11px] font-bold uppercase tracking-wide text-fg-muted', i > 0 && 'pt-3')}>{active ? 'Now and upcoming' : 'History'}</h3>}
            <RosterCard r={r} onOpen={() => onOpen(r)} />
          </React.Fragment>
        );
      })}
      {list.error && <Alert message={list.error} />}
      {list.hasMore && (
        <button type="button" disabled={list.loading} onClick={list.loadMore} className="h-9 w-full rounded-lg border border-line text-xs font-bold text-fg hover:bg-bg-subtle disabled:opacity-50">
          {list.loading ? 'Loading…' : 'Show more'}
        </button>
      )}
    </div>
  );
}

function DayRow({ date, slots, today }: { date: string; slots: RosterSlot[]; today: string }) {
  const [open, setOpen] = React.useState(false);
  const isToday = date === today;
  const shift = slots.find((s) => s.kind === 'shift');
  return (
    <li className={cx(date < today && 'opacity-55')}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className={cx('flex w-full items-center gap-3 rounded border bg-surface px-3 py-2 text-left hover:bg-bg-subtle', isToday ? 'border-fg' : 'border-line')}>
        <span className="w-16 shrink-0 text-sm font-bold text-fg">{dayText(date)}</span>
        <span className="min-w-0 flex-1">
          {slots.map((s) => (
            <span key={s.seq} className="block truncate text-sm">
              <span className={cx('font-bold', s.kind === 'shift' ? 'text-fg' : 'text-fg-muted')}>{slotTitle(s)}</span>
              {s.kind === 'shift' && s.start && <span className="tabular-nums text-fg-muted"> · {slotTimes(s)}</span>}
            </span>
          ))}
          {isToday && <span className="text-[11px] font-extrabold text-fg">Today</span>}
        </span>
        {shift?.code && <span className="rounded border border-fg px-1.5 py-0.5 text-[11px] font-extrabold text-fg">{shift.code}</span>}
      </button>
      {open && <div className="mt-1 space-y-1">{slots.map((s) => <RosterSlotCard key={s.seq} slot={s} showTeam={false} />)}</div>}
    </li>
  );
}

function RosterDays({ roster, onBack }: { roster: MyRoster; onBack: () => void }) {
  const d = useMyRoster(roster.id);
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> All rosters</button>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-extrabold text-fg">{periodText(roster.periodStart, roster.periodEnd)}</p>
          {roster.team && <p className="truncate text-xs text-fg-muted">{roster.team}</p>}
        </div>
        <StateBadge state={roster.state} />
      </div>
      {d.error && <Alert message={d.error} />}
      {d.loading && !d.data && <div className="space-y-1.5">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>}
      {d.data && (
        <ul className="space-y-1.5">
          {d.data.days.map((day) => <DayRow key={day.date} date={day.date} slots={day.slots} today={d.data!.today} />)}
        </ul>
      )}
    </div>
  );
}

/** The employee's rosters, now and upcoming first, then history; one opens day by day. */
export function MyRostersDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [picked, setPicked] = React.useState<MyRoster | null>(null);
  const close = () => { setPicked(null); onClose(); };
  return (
    <Drawer open={open} onClose={close} title="My rosters" maxWidthClassName="sm:max-w-lg">
      {/* The list stays mounted under an open roster, so going back keeps what was loaded. */}
      <div className={picked ? 'hidden' : undefined}><RosterList onOpen={setPicked} /></div>
      {picked && <RosterDays roster={picked} onBack={() => setPicked(null)} />}
    </Drawer>
  );
}
