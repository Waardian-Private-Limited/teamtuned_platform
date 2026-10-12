'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { getRequest } from '@/features/approvals/api/approvals.api';
import { ApprovalTimeline } from '@/features/approvals/components/ApprovalTimeline';
import type { RequestDetail } from '@/features/approvals/types/approvals';
import { EVENT_LABEL } from '../../constants/salaryAdvance.constants';
import type { AdvanceDetail, AdvanceEvent } from '../../types/salaryAdvance.model';
import { dateTimeText, money, monthLabel } from '../../utils/format';

const STRONG = new Set(['approved', 'disbursed', 'disbursed_in_payroll', 'closed']);
const MUTED = new Set(['cancelled', 'withdrawn', 'waived', 'written_off', 'rejected']);

function eventDetail(e: AdvanceEvent): string | null {
  const d = e.data || {};
  const parts: string[] = [];
  if (typeof d.amount === 'number' || typeof d.amount === 'string') parts.push(money(Number(d.amount)));
  if (typeof d.month_key === 'string') parts.push(monthLabel(d.month_key, 'short'));
  if (typeof d.until_month === 'string') parts.push(`until ${monthLabel(d.until_month, 'short')}`);
  if (typeof d.installment_amount === 'number') parts.push(`${money(d.installment_amount)} a month`);
  if (typeof d.mode === 'string' && (e.action === 'skipped')) parts.push(d.mode === 'merge' ? 'merged into next month' : 'moved to the end');
  if (typeof d.reference === 'string' && d.reference) parts.push(`Ref ${d.reference}`);
  if (typeof d.seq === 'number') parts.push(`instalment ${d.seq}`);
  return parts.length ? parts.join(' · ') : null;
}

function eventNote(e: AdvanceEvent): string | null {
  const d = e.data || {};
  const note = d.reason ?? d.note;
  return typeof note === 'string' && note ? note : null;
}

export function AdvanceTimeline({ detail }: { detail: AdvanceDetail }) {
  const [approval, setApproval] = React.useState<RequestDetail | null>(null);
  const requestId = detail.approval?.requestId ?? null;

  React.useEffect(() => {
    if (!requestId) {
      setApproval(null);
      return;
    }
    let cancelled = false;
    getRequest(requestId)
      .then((r) => !cancelled && setApproval(r))
      .catch(() => !cancelled && setApproval(null));
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const events = [...detail.events].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="flex flex-col gap-5">
      {detail.approval && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Approval</h4>
          {approval ? (
            <ApprovalTimeline request={approval} />
          ) : (
            <p className="text-sm text-fg-muted">
              Approval request #{detail.approval.requestId} · <span className="font-semibold capitalize text-fg">{detail.approval.status.replace(/_/g, ' ')}</span>
            </p>
          )}
        </div>
      )}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Activity</h4>
        {events.length === 0 ? (
          <p className="text-sm text-fg-muted">Nothing recorded yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-line pl-5">
            {events.map((e) => {
              const detailText = eventDetail(e);
              const note = eventNote(e);
              return (
                <li key={e.key} className="relative">
                  <span
                    aria-hidden
                    className={cx(
                      'absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-surface',
                      STRONG.has(e.action) ? 'bg-fg' : MUTED.has(e.action) ? 'bg-fg-subtle' : 'border border-fg bg-surface'
                    )}
                  />
                  <p className="text-sm font-semibold text-fg">
                    {EVENT_LABEL[e.action] || e.action.replace(/_/g, ' ')}
                    {e.actor && <span className="font-normal text-fg-muted"> by {e.actor}</span>}
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
        )}
      </div>
    </div>
  );
}
