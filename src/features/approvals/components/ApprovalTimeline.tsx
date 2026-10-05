'use client';

import React from 'react';
import { Check, Clock, CornerUpLeft, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EVENT_LABEL } from '../constants';
import type { RequestDetail } from '../types/approvals';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function taskTone(status: string) {
  if (status === 'approved') return 'border-[var(--tt-success)]/30 text-[var(--tt-success)]';
  if (status === 'rejected') return 'border-[var(--tt-danger)]/30 text-[var(--tt-danger)]';
  if (status === 'pending') return 'border-line text-fg';
  return 'border-dashed border-line text-fg-subtle';
}

export function ApprovalTimeline({ request }: { request: RequestDetail }) {
  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {request.steps.map((s) => {
          const live = request.status === 'pending' && s.index === request.currentStep;
          const reached = s.tasks.length > 0;
          return (
            <li key={s.index} className={cx('rounded-lg border p-3', live ? 'border-[var(--tt-primary)]' : 'border-line', !reached && 'opacity-50')}>
              <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-subtle text-[11px]">{s.index + 1}</span>
                {s.name}
                {live && <span className="text-[11px] font-normal text-fg-muted">waiting</span>}
              </p>
              {reached && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.tasks.map((t) => (
                    <span key={t.id} className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs', taskTone(t.status))}>
                      {t.status === 'approved' && <Check className="h-3 w-3" />}
                      {t.status === 'rejected' && <X className="h-3 w-3" />}
                      {t.status === 'pending' && <Clock className="h-3 w-3" />}
                      {t.status === 'reassigned' && <CornerUpLeft className="h-3 w-3" />}
                      {t.assignee?.name || (t.permission === 'ORG_ADMIN' ? 'Organization admins' : t.permission)}
                      {t.delegatedFrom && <span className="text-fg-muted">for {t.delegatedFrom.name}</span>}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">History</h4>
        <ol className="space-y-2 border-l border-line pl-4">
          {request.events.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="font-medium text-fg">{EVENT_LABEL[e.action] || e.action.replace(/_/g, ' ')}{e.actor ? ` · ${e.actor}` : ''}</p>
              {e.note && <p className="text-xs text-fg-muted">&ldquo;{e.note}&rdquo;</p>}
              <p className="text-[11px] text-fg-subtle">{fmt(e.at)}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
