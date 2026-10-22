'use client';

import { AlarmClock, CheckCheck, Hourglass, Inbox, Timer, TimerReset } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Skeleton } from '@/features/attendance-dashboard/components/Card';
import { durationText, pctText } from '../utils/format';
import type { AuditBacklogDto, AuditTotalsDto } from '../types/audit.dto';

function Tile({ icon: Icon, label, value, note, onClick, strong }: { icon: LucideIcon; label: string; value: string | number; note: string; onClick?: () => void; strong?: boolean }) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', strong ? 'bg-fg text-[var(--tt-fg-inverted)]' : 'bg-bg-subtle text-fg')}><Icon className="h-4 w-4" /></span>
        <span className="truncate text-xs font-semibold text-fg-muted">{label}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-extrabold leading-none tabular-nums text-fg">{value}</div>
        <div className="mt-1.5 truncate text-xs text-fg-muted">{note}</div>
      </div>
    </>
  );
  const base = 'flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-left shadow-[var(--tt-shadow-sm)] transition-colors';
  if (!onClick) return <div className={base}>{body}</div>;
  return <button type="button" onClick={onClick} className={cx(base, 'hover:border-line-strong focus-visible:outline-2 focus-visible:outline-[var(--tt-primary)]')}>{body}</button>;
}

/**
 * The headline: what was raised and how it ended (period), how fast decisions came (period),
 * and what is waiting now (backlog, whatever the period). Backlog tiles open the pending list.
 */
export function AuditKpis({ totals, backlog, loading, onPending, onOverdue }: { totals: AuditTotalsDto | null; backlog: AuditBacklogDto | null; loading: boolean; onPending: () => void; onOverdue: () => void }) {
  if (loading || !totals || !backlog) {
    return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[112px] rounded-xl" />)}</div>;
  }
  const t = totals;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Tile icon={Inbox} label="Raised" value={t.raised} note={`${t.approved} approved · ${t.rejected} rejected`} />
      <Tile icon={CheckCheck} label="Approval rate" value={pctText(t.approval_rate)} note={`${t.withdrawn} withdrawn · ${t.sent_back} sent back`} />
      <Tile icon={Timer} label="Median turnaround" value={durationText(t.turnaround.median)} note={`Average ${durationText(t.turnaround.avg)} · ${t.decided} decided`} />
      <Tile icon={TimerReset} label="Slowest 10% take" value={durationText(t.turnaround.p90)} note="90th percentile, raised to decided" />
      <Tile icon={Hourglass} label="Pending now" value={backlog.pending} note={`Oldest ${durationText(backlog.oldest_minutes)}`} onClick={onPending} strong={backlog.pending > 0} />
      <Tile icon={AlarmClock} label="Past due" value={backlog.overdue} note="Pending beyond the flow's reminder time" onClick={onOverdue} strong={backlog.overdue > 0} />
    </div>
  );
}
