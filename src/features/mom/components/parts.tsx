'use client';

import { Info } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import { addDays, formatDate } from '@/lib/datetime';
import type { DueBucket, MeetingStatus, Point, PointKind, PointStatus } from '../api/mom.api';

export const MOM_CREATE = 'MOM_CREATE';
export const MOM_MANAGE = 'MOM_MANAGE';
export const MOM_FEATURE = 'MOM_FEATURE';

export const POINT_STATUS: Record<PointStatus, { label: string; dot: string }> = {
  open: { label: 'Open', dot: 'bg-fg-subtle' },
  in_progress: { label: 'In progress', dot: 'bg-[var(--tt-warning)]' },
  review: { label: 'In review', dot: 'bg-[var(--tt-warning)]' },
  done: { label: 'Done', dot: 'bg-[var(--tt-success)]' },
  cancelled: { label: 'Cancelled', dot: 'bg-fg-subtle' },
};

export const MEETING_STATUS: Record<MeetingStatus, { label: string; tone: 'active' | 'inactive' | 'terminated' | 'neutral' }> = {
  scheduled: { label: 'Scheduled', tone: 'neutral' },
  live: { label: 'Live', tone: 'active' },
  closed: { label: 'Minutes published', tone: 'active' },
  cancelled: { label: 'Cancelled', tone: 'terminated' },
};

export const KIND_LABEL: Record<PointKind, string> = { action: 'Action', decision: 'Decision', note: 'Note' };

/** What each kind of point means, in one line. */
export const KIND_HELP: Record<PointKind, string> = {
  action: 'Work someone must do. Has an owner and a due date, and moves Open, In progress, Done.',
  decision: 'Something the meeting agreed. Recorded for everyone; nobody has to do anything.',
  note: 'Information to remember. No owner, no due date.',
};

/** An (i) icon that explains Action, Decision and Note, or one kind when `kind` is given. */
export function KindInfo({ kind }: { kind?: PointKind }) {
  const kinds = kind ? [kind] : (['action', 'decision', 'note'] as PointKind[]);
  return (
    <Tooltip side="bottom" align="start" content={<span className="block max-w-[16rem] space-y-1 text-left">{kinds.map((k) => <span key={k} className="block"><b>{KIND_LABEL[k]}:</b> {KIND_HELP[k]}</span>)}</span>}>
      <button type="button" aria-label={kind ? `What is a ${KIND_LABEL[kind].toLowerCase()}?` : 'What are actions, decisions and notes?'} className="inline-flex h-5 w-5 items-center justify-center rounded-full text-fg-subtle transition-colors hover:text-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--tt-primary)]">
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
    </Tooltip>
  );
}

export function StatusTag({ status }: { status: PointStatus }) {
  const s = POINT_STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-fg">
      <span className={cx('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

/** "Today", "Tomorrow", "Fri 30 Oct". Late is the only red. */
export function dueText(dueOn: string, today: string): string {
  if (dueOn === today) return 'Today';
  if (dueOn === addDays(today, 1)) return 'Tomorrow';
  return formatDate(dueOn, 'weekday');
}

export function DueChip({ point, today }: { point: Pick<Point, 'due_on' | 'due_bucket' | 'status'>; today: string }) {
  if (!point.due_on) return null;
  const late = point.due_bucket === 'overdue';
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold', late ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>
      {late ? 'Overdue · ' : 'Due '}
      {dueText(point.due_on, today)}
    </span>
  );
}

export const BUCKET_LABEL: Record<Exclude<DueBucket, 'none'>, string> = { overdue: 'Overdue', today: 'Today', week: 'This week', later: 'Later' };
export const BUCKET_ORDER: Exclude<DueBucket, 'none'>[] = ['overdue', 'today', 'week', 'later'];

/** Preset due dates for the quick-add bar and the point form. */
export function duePresets(today: string): { label: string; value: string }[] {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const toFriday = ((5 - dow + 7) % 7) || 7;
  const toMonday = ((1 - dow + 7) % 7) || 7;
  const list = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    ...(toFriday > 1 ? [{ label: 'Friday', value: addDays(today, toFriday) }] : []),
    { label: 'Next week', value: addDays(today, toMonday) },
  ];
  return list.filter((p, i) => list.findIndex((q) => q.value === p.value) === i);
}
