'use client';

import { cx } from '@/theme/tokens';
import type { TeamCounts, TeamStatus } from '../api/teams.api';

export const TEAMS_MANAGE = 'TEAM_MANAGE';
export const TEAMS_CREATE = 'TEAM_CREATE';

type Tone = 'good' | 'warn' | 'bad' | 'muted';

export const STATUS: Record<TeamStatus, { label: string; tone: Tone }> = {
  working: { label: 'Working', tone: 'good' },
  completed: { label: 'Done for the day', tone: 'good' },
  half_day: { label: 'Half day', tone: 'good' },
  not_checked_in: { label: 'Not in yet', tone: 'warn' },
  absent: { label: 'Absent', tone: 'bad' },
  on_leave: { label: 'On leave', tone: 'muted' },
  holiday: { label: 'Holiday', tone: 'muted' },
  week_off: { label: 'Week off', tone: 'muted' },
};

const DOT: Record<Tone, string> = {
  good: 'bg-[var(--tt-success)]',
  warn: 'bg-[var(--tt-warning)]',
  bad: 'bg-[var(--tt-danger)]',
  muted: 'bg-fg-subtle',
};

/** The groups the counts and filters use. Every status belongs to one. */
export type Bucket = 'present' | 'not_in' | 'on_leave' | 'absent' | 'off';
export const BUCKETS: { key: Bucket; label: string; tone: Tone }[] = [
  { key: 'present', label: 'In', tone: 'good' },
  { key: 'not_in', label: 'Not in yet', tone: 'warn' },
  { key: 'on_leave', label: 'On leave', tone: 'muted' },
  { key: 'absent', label: 'Absent', tone: 'bad' },
  { key: 'off', label: 'Off', tone: 'muted' },
];
export const bucketOf = (s: TeamStatus): Bucket =>
  s === 'working' || s === 'completed' || s === 'half_day' ? 'present' : s === 'not_checked_in' ? 'not_in' : s === 'holiday' || s === 'week_off' ? 'off' : s;

export function StatusDot({ status, className }: { status: TeamStatus; className?: string }) {
  const tone = STATUS[status].tone;
  return (
    <span className={cx('relative inline-flex h-2 w-2 shrink-0', className)}>
      {status === 'working' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--tt-success)] opacity-60" />}
      <span className={cx('relative inline-flex h-2 w-2 rounded-full', DOT[tone])} />
    </span>
  );
}

export function StatusTag({ status }: { status: TeamStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-fg">
      <StatusDot status={status} />
      {STATUS[status].label}
    </span>
  );
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

/** A person's photo (or initials) with where they are today as a dot on the corner. */
export function Face({ name, photo, status, size = 'md' }: { name: string; photo?: string | null; status?: TeamStatus; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-12 w-12 text-sm' : 'h-10 w-10 text-xs';
  return (
    <span className={cx('relative inline-flex shrink-0', box)}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-full w-full rounded-full border border-line object-cover" loading="lazy" />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full border border-line bg-bg-subtle font-bold text-fg">{initials(name)}</span>
      )}
      {status && <span className="absolute -bottom-0.5 -right-0.5 flex rounded-full bg-surface p-[2px]"><StatusDot status={status} /></span>}
    </span>
  );
}

/** "6 of 9 in" with a thin bar split by bucket: the shape of the team today at a glance. */
export function CountsBar({ counts }: { counts: TeamCounts }) {
  const parts = BUCKETS.map((b) => ({ ...b, n: counts[b.key] })).filter((p) => p.n > 0);
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle" role="img" aria-label={parts.map((p) => `${p.n} ${p.label}`).join(', ') || 'No one'}>
      {parts.map((p) => <span key={p.key} className={cx('h-full', DOT[p.tone])} style={{ width: `${(p.n / Math.max(1, counts.total)) * 100}%` }} />)}
    </div>
  );
}

export function CountsLine({ counts }: { counts: TeamCounts }) {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-muted">
      {BUCKETS.filter((b) => counts[b.key] > 0).map((b) => (
        <span key={b.key} className="inline-flex items-center gap-1.5"><span className={cx('h-1.5 w-1.5 rounded-full', DOT[b.tone])} /><span className="font-semibold text-fg tabular-nums">{counts[b.key]}</span> {b.label}</span>
      ))}
    </p>
  );
}
