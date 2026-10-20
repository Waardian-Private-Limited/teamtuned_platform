'use client';

import { AlertTriangle, CalendarClock, CheckSquare, MapPin, Paperclip, User } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Pill } from '@/features/data-collection/components/shared/Ui';
import { PRIORITY_LABEL, STATUS_LABEL, dueText } from '../constants/tm.constants';
import type { Priority, TaskRow, TaskStatus } from '../types/tm.types';

const PRIORITY_DOT: Record<Priority, string> = { low: 'bg-line-strong', medium: 'bg-fg-subtle', high: 'bg-fg', urgent: 'bg-[var(--tt-danger)]' };

export function PriorityMark({ priority, withLabel = false }: { priority: Priority; withLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted" title={`${PRIORITY_LABEL[priority]} priority`}>
      <span className={cx('h-2 w-2 rounded-full', PRIORITY_DOT[priority])} />
      {withLabel && PRIORITY_LABEL[priority]}
    </span>
  );
}

export const statusTone = (s: TaskStatus) => (s === 'done' ? 'good' : s === 'returned' || s === 'cancelled' ? 'bad' : s === 'in_progress' || s === 'submitted' ? 'strong' : 'neutral') as 'good' | 'bad' | 'strong' | 'neutral';
export const StatusPill = ({ status }: { status: TaskStatus }) => <Pill label={STATUS_LABEL[status]} tone={statusTone(status)} />;

/** A compact card used on the board and in lists. */
export function TaskCard({ task, onOpen, dragging }: { task: TaskRow; onOpen: () => void; dragging?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx('block w-full rounded-xl border bg-surface p-3 text-left shadow-[var(--tt-shadow-sm)] transition-colors hover:border-line-strong', dragging ? 'border-fg' : 'border-line', task.overdue && 'border-l-4 border-l-[var(--tt-danger)]')}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm font-semibold text-fg">{task.title}</span>
        <PriorityMark priority={task.priority} />
      </div>
      <div className={cx('mt-2 flex items-center gap-1.5 text-[11px]', task.overdue ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted')}>
        {task.overdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
        <span className="truncate">{task.overdue ? 'Overdue · ' : ''}{dueText(task.due_at)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-muted">
        <span className="inline-flex min-w-0 items-center gap-1"><User className="h-3 w-3 shrink-0" /><span className="truncate">{task.assignee_name || '—'}</span></span>
        {task.site_name && <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{task.site_name}</span></span>}
        {task.form_id && <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" />Data</span>}
        {task.requires_review && <span className="inline-flex items-center gap-1"><CheckSquare className="h-3 w-3" />Review</span>}
      </div>
      {task.labels.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{task.labels.slice(0, 3).map((l) => <span key={l} className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">{l}</span>)}</div>}
    </button>
  );
}

/** One row for list-like pages. */
export function TaskRowItem({ task, onOpen, showAssignee = true }: { task: TaskRow; onOpen: () => void; showAssignee?: boolean }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-bg-subtle sm:px-4">
        <PriorityMark priority={task.priority} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-fg">{task.title}</div>
          <div className={cx('truncate text-xs', task.overdue ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted')}>
            {task.overdue ? 'Overdue · ' : ''}{dueText(task.due_at)}{showAssignee && task.assignee_name ? ` · ${task.assignee_name}` : ''}{task.site_name ? ` · ${task.site_name}` : ''}
          </div>
        </div>
        <StatusPill status={task.status} />
      </button>
    </li>
  );
}
