'use client';

import { Check, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EVENT_LABEL } from '../../constants/petty-cash.constants';
import type { ApprovalSummary, ExpenseEvent } from '../../types/petty-cash.model';
import { dateTimeText, money } from '../../utils/format';

const STEP_DOT: Record<string, string> = {
  approved: 'bg-fg text-[var(--tt-on-primary)]',
  rejected: 'bg-[var(--tt-danger)] text-white',
  current: 'border-2 border-fg bg-surface text-fg',
  skipped: 'border border-line bg-bg-subtle text-fg-subtle',
  waiting: 'border border-line-strong bg-surface text-fg-subtle',
};

const STEP_LABEL: Record<string, string> = { approved: 'Approved', rejected: 'Rejected', current: 'Waiting now', skipped: 'Not needed', waiting: 'Next' };

/** The approval request as numbered steps with who acted and when. */
export function ApprovalSteps({ approval }: { approval: ApprovalSummary }) {
  if (!approval.steps.length) return <p className="text-sm text-fg-muted">Approval request #{approval.requestId} · {approval.status.replace(/_/g, ' ')}</p>;
  return (
    <ol className="flex flex-col gap-3">
      {approval.steps.map((s) => (
        <li key={s.index} className="flex gap-3">
          <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', STEP_DOT[s.state] || STEP_DOT.waiting)}>
            {s.state === 'approved' ? <Check className="h-3.5 w-3.5" aria-hidden /> : s.state === 'rejected' ? <X className="h-3.5 w-3.5" aria-hidden /> : s.index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">
              {s.name} <span className="font-normal text-fg-muted">· {STEP_LABEL[s.state] || s.state}</span>
            </p>
            {s.approvers.map((a, i) => (
              <div key={`${a.name}-${i}`} className="mt-0.5 text-xs text-fg-muted">
                {a.name}
                {a.actedAt ? ` · ${a.status.replace(/_/g, ' ')} ${dateTimeText(a.actedAt)}` : ''}
                {a.note && <p className="mt-1 rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg">{a.note}</p>}
              </div>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

function eventDetail(e: ExpenseEvent): string | null {
  const d = e.data;
  const parts: string[] = [];
  if (typeof d.from === 'number' && typeof d.to === 'number') parts.push(`${money(d.from)} to ${money(d.to)}`);
  if (typeof d.amount === 'number') parts.push(money(d.amount));
  if (typeof d.approved_amount === 'number') parts.push(`${money(d.approved_amount)} approved`);
  if (typeof d.inward_no === 'string' && d.inward_no) parts.push(`Inward ${d.inward_no}`);
  else if (Array.isArray(d.inward_nos) && d.inward_nos.length) parts.push(`Inward ${d.inward_nos.join(', ')}`);
  return parts.length ? parts.join(' · ') : null;
}

const STRONG = new Set(['approved', 'submitted', 'created', 'inward_received', 'paper_received']);
const MUTED = new Set(['cancelled', 'withdrawn', 'rejected', 'inward_undone', 'paper_undone']);

/** What happened to the expense, newest first. */
export function ExpenseHistory({ events }: { events: ExpenseEvent[] }) {
  const sorted = [...events].sort((a, b) => ((a.at || '') < (b.at || '') ? 1 : -1));
  if (!sorted.length) return <p className="text-sm text-fg-muted">Nothing recorded yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {sorted.map((e) => {
        const detailText = eventDetail(e);
        const note = typeof e.data.note === 'string' ? e.data.note : typeof e.data.reason === 'string' ? e.data.reason : null;
        return (
          <li key={e.id} className="relative">
            <span aria-hidden className={cx('absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-surface', STRONG.has(e.action) ? 'bg-fg' : MUTED.has(e.action) ? 'bg-fg-subtle' : 'border border-fg bg-surface')} />
            <p className="text-sm font-semibold text-fg">
              {EVENT_LABEL[e.action] || e.action.replace(/_/g, ' ')}
              {e.by && <span className="font-normal text-fg-muted"> by {e.by}</span>}
            </p>
            <p className="text-xs text-fg-muted">
              {dateTimeText(e.at)}
              {detailText ? ` · ${detailText}` : ''}
            </p>
            {note && <p className="mt-1 rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg">{note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
