'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileDown, UserCheck, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { formatDate, formatDateTime } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { formatInr } from '../../interviews/lib/ui';
import { EmptyTab, SmallButton } from '../../shared/components/candidate-drawer/parts';
import * as api from '../api/reviews.api';
import type { ReviewDto } from '../types/reviews.dto';
import { DecisionBadge } from './DecisionBadge';
import { AskReviewForm, OfflineDecisionForm, downloadReviewPack } from './ReviewForms';

/** Candidate drawer → Reviews: who was asked, their decisions (online and offline), and the actions. */
export function ReviewsTab({ applicationId, candidateName, canAct, onChanged }: { applicationId: number; candidateName: string; canAct: boolean; onChanged?: () => void }) {
  const [items, setItems] = useState<ReviewDto[] | null>(null);
  const [form, setForm] = useState<'ask' | 'offline' | null>(null);
  const [packing, setPacking] = useState(false);

  const load = useCallback(() => {
    api.listForApplication(applicationId).then((r) => setItems(r.items)).catch((err) => { showError(messageOf(err)); setItems([]); });
  }, [applicationId]);
  useEffect(() => { load(); }, [load]);

  const done = () => { setForm(null); load(); onChanged?.(); };

  async function cancel(r: ReviewDto) {
    try { await api.cancelReview(r.id); showSuccess('Review request cancelled'); load(); } catch (err) { showError(messageOf(err)); }
  }

  const actions = canAct ? (
    <div className="flex flex-wrap justify-end gap-2">
      <SmallButton icon={FileDown} onClick={async () => { setPacking(true); await downloadReviewPack(applicationId, candidateName); setPacking(false); }} disabled={packing}>{packing ? 'Preparing…' : 'Review pack'}</SmallButton>
      <SmallButton onClick={() => setForm('offline')}>Record decision</SmallButton>
      <SmallButton primary icon={UserCheck} onClick={() => setForm('ask')}>Send for review</SmallButton>
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      {actions}
      {items === null ? (
        <div className="h-20 animate-pulse rounded-lg bg-bg-subtle" />
      ) : items.length === 0 ? (
        <EmptyTab title="No reviews yet" description="Before an offer, ask someone to review this candidate, or record a decision made outside TeamTuned." />
      ) : (
        <ul className="space-y-2.5">
          {items.map((r) => (
            <li key={r.id} className="rounded-lg border border-line p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">{r.reviewer.name || 'Reviewer'}{r.reviewer.designation ? <span className="font-normal text-fg-muted"> · {r.reviewer.designation}</span> : null}</p>
                  <p className="text-[11px] text-fg-muted">
                    {r.channel === 'offline' ? 'Recorded by HR' : `Asked by ${r.requestedBy || 'HR'}`} · {formatDateTime(r.decidedAt || r.createdAt)}
                  </p>
                </div>
                <span className="flex items-center gap-1.5">
                  <DecisionBadge review={r} />
                  {canAct && r.status === 'pending' && (
                    <button type="button" onClick={() => cancel(r)} aria-label="Cancel request" className="rounded p-0.5 text-fg-muted hover:text-fg"><X className="h-3.5 w-3.5" /></button>
                  )}
                </span>
              </div>
              {(r.suggestedCtc || r.suggestedJoiningDate) && (
                <p className="mt-1.5 text-xs text-fg">
                  Suggested: {[r.suggestedCtc ? `${formatInr(r.suggestedCtc)} a year` : null, r.suggestedJoiningDate ? `joining ${formatDate(r.suggestedJoiningDate)}` : null].filter(Boolean).join(', ')}
                </p>
              )}
              {r.note && <p className="mt-1.5 whitespace-pre-wrap text-xs text-fg-muted">{r.note}</p>}
              {r.message && r.status === 'pending' && <p className="mt-1.5 text-[11px] italic text-fg-subtle">“{r.message}”</p>}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={form !== null} onClose={() => setForm(null)} title={form === 'ask' ? 'Send for review' : 'Record a decision'} maxWidthClassName="max-w-lg">
        {form === 'ask' && <AskReviewForm applicationId={applicationId} onDone={done} onCancel={() => setForm(null)} />}
        {form === 'offline' && <OfflineDecisionForm applicationId={applicationId} onDone={done} onCancel={() => setForm(null)} />}
      </Dialog>
    </div>
  );
}
