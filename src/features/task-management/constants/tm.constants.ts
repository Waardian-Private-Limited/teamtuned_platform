import type { ColumnKey, Priority, TaskAction, TaskStatus } from '../types/tm.types';

export const TM_FEATURE = 'TASK_MANAGEMENT_FEATURE';
export const TM_PERMISSIONS = { CREATE: 'TM_CREATE', MANAGE: 'TM_MANAGE_ALL', VIEW: 'TM_VIEW_ALL' } as const;

export const STATUS_LABEL: Record<TaskStatus, string> = {
  assigned: 'Assigned', acknowledged: 'Acknowledged', in_progress: 'In progress', paused: 'Paused', submitted: 'In review', returned: 'Sent back', done: 'Done', cancelled: 'Cancelled',
};
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
export const COLUMNS: { key: ColumnKey; label: string; hint: string }[] = [
  { key: 'todo', label: 'To do', hint: 'Assigned, acknowledged or sent back' },
  { key: 'doing', label: 'In progress', hint: 'Started or paused' },
  { key: 'review', label: 'In review', hint: 'Waiting for the reviewer' },
  { key: 'done', label: 'Done', hint: 'Finished in the last 14 days' },
];

/** The button text for each action; submit changes with the review setting. */
export const actionLabel = (a: TaskAction, requiresReview: boolean): string => ({
  acknowledge: 'Acknowledge', start: 'Start', pause: 'Pause', resume: 'Resume', submit: requiresReview ? 'Submit for review' : 'Mark done',
  approve: 'Approve', return: 'Send back', cancel: 'Cancel task', reopen: 'Reopen',
}[a]);

/** Which action moves a card to a column, by its current status. Only what the state machine can do from there. */
export function actionToColumn(status: TaskStatus, to: ColumnKey, requiresReview: boolean): TaskAction | null {
  if (to === 'doing') return status === 'paused' ? 'resume' : ['assigned', 'acknowledged', 'returned'].includes(status) ? 'start' : null;
  if (to === 'review') return requiresReview && ['assigned', 'acknowledged', 'in_progress', 'paused', 'returned'].includes(status) ? 'submit' : null;
  if (to === 'done') return status === 'submitted' ? 'approve' : !requiresReview && ['assigned', 'acknowledged', 'in_progress', 'paused', 'returned'].includes(status) ? 'submit' : null;
  if (to === 'todo') return status === 'submitted' ? 'return' : status === 'done' ? 'reopen' : null;
  return null;
}

export const columnOf = (status: TaskStatus): ColumnKey | null => (
  ['assigned', 'acknowledged', 'returned'].includes(status) ? 'todo' : ['in_progress', 'paused'].includes(status) ? 'doing' : status === 'submitted' ? 'review' : status === 'done' ? 'done' : null
);

export function dueText(iso: string | null): string {
  if (!iso) return 'No due time';
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function duration(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600); const m = Math.round((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}
