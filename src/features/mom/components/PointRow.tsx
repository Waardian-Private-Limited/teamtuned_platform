'use client';

import { CheckCheck, CheckSquare, Gavel, ListTodo, MessageSquare, ShieldCheck, StickyNote, Users } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Btn } from '@/features/performance/components/ui';
import type { Point, PointAction, PointKind } from '../api/mom.api';
import { assignLabel, audienceLabel } from './AssignPicker';
import { DueChip, StatusTag } from './parts';

const ICON: Record<PointKind, typeof CheckSquare> = { action: CheckSquare, decision: Gavel, note: StickyNote };

/** What the owner's "done" is called: a point that needs sign-off is handed over, not finished. */
export const actionLabel = (point: Point, action: PointAction): string => {
  switch (action) {
    case 'start': return 'Start';
    case 'done': return point.needs_signoff && point.is_mine && !point.can_edit ? 'Hand over' : 'Done';
    case 'confirm': return 'Confirm';
    case 'send_back': return 'Send back';
    case 'cancel': return 'Cancel';
    default: return 'Reopen';
  }
};

// The buttons a row offers in place. Sending back needs a reason, and cancelling is rare: both live in the drawer.
const QUICK: PointAction[] = ['start', 'done', 'confirm'];

/** "Acknowledged 3 of 5", or a tick once this person has. */
export function AckBadge({ point }: { point: Point }) {
  return (
    <span className={cx('inline-flex items-center gap-1 text-[11px] font-semibold', point.acked_by_me || (point.ack_total > 0 && point.ack_count === point.ack_total) ? 'text-fg' : 'text-fg-muted')}>
      <CheckCheck className="h-3 w-3" aria-hidden />{point.ack_total > 0 ? `Acknowledged ${point.ack_count} of ${point.ack_total}` : 'Needs acknowledgement'}
    </span>
  );
}

/** One point as a row: what it says, who has it, when it is due, where it stands, and the next step as a button. */
export function PointRow({ point, today, onOpen, onAct, onAck, onTask, busy, showMeeting }: {
  point: Point; today: string; onOpen: (p: Point) => void; onAct?: (p: Point, a: PointAction) => void; onAck?: (p: Point) => void; onTask?: (p: Point) => void; busy?: boolean; showMeeting?: boolean;
}) {
  const Icon = ICON[point.kind];
  const quick = QUICK.filter((a) => point.allowed_actions.includes(a));
  const finished = point.status === 'done' || point.status === 'cancelled';
  return (
    <li className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-bg-subtle/60 sm:px-4">
      <button type="button" onClick={() => onOpen(point)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className={cx('block text-sm font-semibold text-fg', finished && 'text-fg-muted line-through')}>{point.text}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {point.kind === 'action' && <span className="text-xs text-fg-muted">{assignLabel(point) || 'No owner'}</span>}
            {point.kind === 'action' && <DueChip point={point} today={today} />}
            {point.kind === 'action' && point.status && <StatusTag status={point.status} />}
            {point.priority === 'high' && point.kind === 'action' && <span className="text-[11px] font-bold uppercase tracking-wide text-fg">High</span>}
            {point.task_id && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-fg-muted"><ListTodo className="h-3 w-3" aria-hidden />Task</span>}
            {point.needs_signoff && point.kind === 'action' && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-fg-muted"><ShieldCheck className="h-3 w-3" aria-hidden />Sign-off</span>}
            {point.kind !== 'action' && audienceLabel(point) && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-fg-muted"><Users className="h-3 w-3" aria-hidden />Shared with {audienceLabel(point)}</span>}
            {point.kind === 'decision' && point.needs_ack && <AckBadge point={point} />}
            {!!point.comment_count && <span className="inline-flex items-center gap-1 text-[11px] text-fg-muted"><MessageSquare className="h-3 w-3" aria-hidden />{point.comment_count}</span>}
            {showMeeting && point.meeting_title && <span className="truncate text-[11px] text-fg-muted">{point.meeting_title}</span>}
          </span>
        </span>
      </button>
      {onTask && point.can_task && <Btn size="sm" variant="secondary" icon={ListTodo} disabled={busy} onClick={() => onTask(point)}>Convert to task</Btn>}
      {onAck && point.can_ack && <Btn size="sm" disabled={busy} onClick={() => onAck(point)}>Acknowledge</Btn>}
      {onAct && quick.length > 0 && (
        <div className="flex shrink-0 gap-1.5">
          {point.allowed_actions.includes('send_back') && <Btn size="sm" variant="ghost" disabled={busy} onClick={() => onOpen(point)}>Send back</Btn>}
          {quick.map((a, i) => (
            <Btn key={a} size="sm" variant={i === quick.length - 1 ? 'primary' : 'secondary'} disabled={busy} onClick={() => onAct(point, a)}>{actionLabel(point, a)}</Btn>
          ))}
        </div>
      )}
    </li>
  );
}

/**
 * An action given to several people one each: the shared text and how far they all are, then one line per person with
 * their own status and next step.
 */
export function PointGroup({ points, today, onOpen, onAct, busyId }: {
  points: Point[]; today: string; onOpen: (p: Point) => void; onAct?: (p: Point, a: PointAction) => void; busyId?: number | null;
}) {
  const first = points[0];
  const done = points.filter((p) => p.status === 'done').length;
  const live = points.filter((p) => p.status !== 'cancelled');
  const t = first.assign_target;
  const group = t && t.kind === 'group' ? [t.departments.map((d) => d.name).join(', '), t.sites.length ? `at ${t.sites.map((x) => x.name).join(', ')}` : ''].filter(Boolean).join(' ') : '';
  return (
    <li className="px-3 py-3 sm:px-4">
      <div className="flex items-start gap-3">
        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{first.text}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            <span>One each{group ? ` · ${group}` : ''}</span>
            <span className="font-semibold text-fg">{done} of {live.length} done</span>
            <DueChip point={first} today={today} />
          </p>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
            {points.map((p) => {
              const quick = (['start', 'done', 'confirm'] as PointAction[]).filter((a) => p.allowed_actions.includes(a));
              return (
                <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                  <button type="button" onClick={() => onOpen(p)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="truncate text-sm text-fg">{p.owner_name || 'No owner'}</span>
                    {p.status && <StatusTag status={p.status} />}
                    {p.due_bucket === 'overdue' && <span className="text-[11px] font-semibold text-[var(--tt-danger)]">Overdue</span>}
                  </button>
                  {onAct && quick.map((a, i) => (
                    <Btn key={a} size="sm" variant={i === quick.length - 1 ? 'primary' : 'secondary'} disabled={busyId === p.id} onClick={() => onAct(p, a)}>{actionLabel(p, a)}</Btn>
                  ))}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </li>
  );
}

/** Actions in display order, with one-each copies gathered under the first of them. */
export function groupActions(points: Point[]): ({ kind: 'one'; point: Point } | { kind: 'group'; points: Point[] })[] {
  const out: ({ kind: 'one'; point: Point } | { kind: 'group'; points: Point[] })[] = [];
  const groups = new Map<number, Point[]>();
  for (const p of points) {
    if (!p.group_id) { out.push({ kind: 'one', point: p }); continue; }
    const list = groups.get(p.group_id);
    if (list) { list.push(p); continue; }
    const fresh = [p];
    groups.set(p.group_id, fresh);
    out.push({ kind: 'group', points: fresh });
  }
  return out;
}
