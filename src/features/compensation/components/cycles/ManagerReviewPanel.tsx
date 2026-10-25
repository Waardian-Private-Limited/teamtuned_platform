'use client';

import React from 'react';
import { Bell, Lock, RotateCcw, Send } from 'lucide-react';
import { TextField } from '@/components/ui/FormControls';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../../api/compensation.api';
import type { CycleDto } from '../../types/compensation.dto';
import { date } from '../../utils/format';
import { Btn } from '../shared/Buttons';
import { ConfirmDialog, type ConfirmState } from '../shared/ConfirmDialog';
import { td, th } from '../shared/Panel';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * HR's view of a manager-rated cycle: send it to managers with a due date, follow each manager's progress, remind, reopen one
 * manager, and close the review (submitted ratings then land on the proposals).
 */
export function ManagerReviewPanel({ cycle, canEdit, onChanged }: { cycle: CycleDto; canEdit: boolean; onChanged: () => Promise<unknown> }) {
  const review = cycle.review;
  const summary = cycle.manager_review;
  const [due, setDue] = React.useState(review.due_date || '');
  const [dueError, setDueError] = React.useState('');
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  React.useEffect(() => setDue(review.due_date || ''), [review.due_date]);

  const draft = cycle.status === 'draft';
  const open = review.status === 'open';
  const t = summary?.totals;

  const run = async (key: string, fn: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try {
      await fn();
      showSuccess(message);
      await onChanged();
    } catch (err) {
      const field = err instanceof ApiError ? (err.data as { field?: string } | null)?.field : undefined;
      if (field === 'due_date') setDueError(messageOf(err));
      else showError(messageOf(err));
    } finally {
      setBusy(null);
    }
  };

  const send = () => {
    setDueError('');
    if (!due) { setDueError('Pick the date managers should finish by'); return; }
    void run('send', () => api.sendManagerReview(cycle.id, due), open ? 'Due date updated and new people sent to their managers' : 'Sent to managers');
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Manager ratings</p>
          <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
            {review.status === 'not_started' && 'Each employee’s reporting manager rates them in Team appraisals. Managers see names and ratings only, never pay.'}
            {open && `Open to managers until ${date(review.due_date)}. ${t?.people_submitted ?? 0} of ${t?.people ?? 0} people submitted.`}
            {review.status === 'closed' && `Closed ${date(review.closed_at)}. Submitted ratings are on the proposals: apply the rating guide to set increments, then adjust.`}
          </p>
          {(summary?.with_hr ?? 0) > 0 && <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">{summary?.with_hr} {summary?.with_hr === 1 ? 'person has' : 'people have'} no active manager and stay with you.</p>}
        </div>
        {canEdit && draft && review.status !== 'closed' && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-44">
              <TextField label="Managers finish by" type="date" min={todayIso()} value={due} onChange={(v) => { setDue(v); setDueError(''); }} error={dueError} />
            </div>
            <Btn variant={open ? 'secondary' : 'primary'} icon={<Send className="h-3.5 w-3.5" />} busy={busy === 'send'} onClick={send}>{open ? 'Update and send' : 'Send to managers'}</Btn>
            {open && (t?.managers_pending ?? 0) > 0 && <Btn icon={<Bell className="h-3.5 w-3.5" />} busy={busy === 'remind'} onClick={() => run('remind', async () => { const r = await api.remindManagers(cycle.id); showSuccess(`Reminded ${r.reminded} manager${r.reminded === 1 ? '' : 's'}`); }, 'Reminders sent')}>Remind all</Btn>}
            {open && (
              <Btn
                icon={<Lock className="h-3.5 w-3.5" />}
                onClick={() => setConfirm({
                  title: 'Close manager review',
                  body: <>Managers can no longer change ratings. {t?.people_submitted ?? 0} submitted rating{t?.people_submitted === 1 ? '' : 's'} are copied to the proposals{t?.people_pending ? `; ${t.people_pending} not submitted stay for you to rate` : ''}.</>,
                  cta: 'Close review',
                  run: () => run('close', () => api.closeManagerReview(cycle.id), 'Manager review closed'),
                })}
              >
                Close review
              </Btn>
            )}
          </div>
        )}
      </div>

      {summary && summary.managers.length > 0 && (
        <div className="mt-3 overflow-auto rounded-lg border border-line tt-scroll-hidden">
          <table className="w-full min-w-[560px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={th}>Manager</th>
                <th className={th}>Rated</th>
                <th className={th}>Submitted</th>
                <th className={th}>Status</th>
                {canEdit && open && <th className={th} />}
              </tr>
            </thead>
            <tbody>
              {summary.managers.map((m) => (
                <tr key={m.evaluator_employee_id}>
                  <td className={cx(td, 'font-semibold')}>{m.name || `Employee ${m.evaluator_employee_id}`}</td>
                  <td className={td}>{m.rated} / {m.total}</td>
                  <td className={td}>{m.submitted} / {m.total}</td>
                  <td className={td}>
                    <span className={cx('rounded border px-1.5 py-0.5 text-[10px] font-semibold', m.done ? 'border-line text-fg-muted' : 'border-fg text-fg')}>{m.done ? 'Done' : 'Pending'}</span>
                  </td>
                  {canEdit && open && (
                    <td className={cx(td, 'text-right')}>
                      <div className="flex justify-end gap-1.5">
                        {!m.done && <Btn variant="ghost" icon={<Bell className="h-3.5 w-3.5" />} busy={busy === `remind:${m.evaluator_employee_id}`} onClick={() => run(`remind:${m.evaluator_employee_id}`, () => api.remindManagers(cycle.id, m.evaluator_employee_id), 'Reminder sent')}>Remind</Btn>}
                        {m.submitted > 0 && <Btn variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} busy={busy === `reopen:${m.evaluator_employee_id}`} onClick={() => run(`reopen:${m.evaluator_employee_id}`, () => api.reopenManagerReview(cycle.id, m.evaluator_employee_id), 'Sent back to the manager')}>Reopen</Btn>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
