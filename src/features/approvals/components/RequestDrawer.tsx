'use client';

import React from 'react';
import { Check, CornerUpLeft, Send, Undo2, UserRoundCog, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Drawer } from '@/components/ui/Drawer';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/approvals.api';
import { STATUS_LABEL } from '../constants';
import type { EmployeeRef, RequestDetail } from '../types/approvals';
import { ApprovalTimeline } from './ApprovalTimeline';
import { EmployeeSearch } from './EmployeeSearch';

type Action = 'approve' | 'reject' | 'send_back' | 'reassign';

/** One labelled fact; long values (a reason, a place) take the full row so they never squeeze. */
function Fact({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cx('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

export function RequestDrawer({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged: () => void }) {
  const [request, setRequest] = React.useState<RequestDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [action, setAction] = React.useState<Action | null>(null);
  const [note, setNote] = React.useState('');
  const [noteError, setNoteError] = React.useState('');
  const [target, setTarget] = React.useState<EmployeeRef[]>([]);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    try { setRequest(await api.getRequest(id)); setError(null); } catch (e) { setError(messageOf(e)); }
  }, [id]);

  React.useEffect(() => { setRequest(null); setAction(null); load(); }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); showSuccess(ok); setAction(null); setNote(''); setTarget([]); await load(); onChanged(); } catch (e) { showError(messageOf(e)); } finally { setBusy(false); }
  };

  const confirm = () => {
    if (!request || !action) return;
    if ((action === 'reject' || action === 'send_back') && !note.trim()) { setNoteError(action === 'reject' ? 'Add a reason for rejecting' : 'Say what needs to change'); return; }
    if (action === 'reassign') {
      if (!target[0]) return;
      return run(() => api.reassign(request.id, target[0].id), 'Reassigned');
    }
    if (action === 'send_back') return run(() => api.sendBack(request.id, note.trim()), 'Sent back');
    return run(() => api.decide(request.id, action, note.trim() || undefined), action === 'approve' ? 'Approved' : 'Rejected');
  };

  const a = request?.actions;
  const titles: Record<Action, string> = { approve: 'Approve request', reject: 'Reject request', send_back: 'Send back for changes', reassign: 'Reassign to another approver' };

  return (
    <Drawer open={Boolean(id)} onClose={onClose} title={request?.detail?.title || request?.typeLabel || 'Request'} maxWidthClassName="sm:max-w-2xl xl:max-w-5xl">
      {error && <Alert message={error} />}
      {!request && !error && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]" aria-busy="true">
          <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-subtle" />)}</div>
          <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />
        </div>
      )}
      {request && (
        // Wide enough to read a request at a glance: facts in two columns, the timeline beside them on large screens.
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-4">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Fact label="Type" value={request.typeLabel} />
              <Fact label="Requested by" value={request.requester?.name || '—'} />
              <Fact label="Status" value={STATUS_LABEL[request.status]} />
              {request.detail?.lines.map((l, i) => (
                <Fact key={`${i}-${l.label}`} label={l.label} wide={l.value.length > 48}
                  value={/^https?:\/\//.test(l.value) ? <a href={l.value} target="_blank" rel="noopener noreferrer" className="text-[var(--tt-primary)] underline-offset-2 hover:underline">View file</a> : l.value} />
              ))}
            </dl>
            {request.detail?.impact && (
              <div className="rounded-lg border border-line bg-bg-subtle p-3">
                <p className="text-xs font-semibold text-fg">{request.detail.impact.label}</p>
                <p className="mt-1 text-sm text-fg-muted">{(request.detail.impact.items ?? []).join(', ')}</p>
              </div>
            )}
          </div>
          <div className="min-w-0 xl:border-l xl:border-line xl:pl-5">
            <ApprovalTimeline request={request} />
          </div>
        </div>
      )}
      {a && (a.decide || a.sendBack || a.withdraw || a.resubmit || a.override || a.reassign) && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          {(a.decide || a.override) && <Btn variant="primary" icon={<Check className="h-4 w-4" />} onClick={() => setAction('approve')}>{a.override ? 'Approve as admin' : 'Approve'}</Btn>}
          {(a.decide || a.override) && <Btn variant="danger" icon={<X className="h-4 w-4" />} onClick={() => setAction('reject')}>Reject</Btn>}
          {a.sendBack && <Btn icon={<CornerUpLeft className="h-4 w-4" />} onClick={() => setAction('send_back')}>Send back</Btn>}
          {a.reassign && <Btn icon={<UserRoundCog className="h-4 w-4" />} onClick={() => setAction('reassign')}>Reassign</Btn>}
          {a.resubmit && <Btn variant="primary" icon={<Send className="h-4 w-4" />} busy={busy} onClick={() => request && run(() => api.resubmit(request.id), 'Resubmitted')}>Resubmit</Btn>}
          {a.withdraw && <Btn icon={<Undo2 className="h-4 w-4" />} busy={busy} onClick={() => request && run(() => api.withdraw(request.id), 'Withdrawn')}>Withdraw</Btn>}
        </div>
      )}

      <Dialog open={Boolean(action)} onClose={() => setAction(null)} title={action ? titles[action] : ''}
        footer={<div className="flex justify-end gap-2"><Btn onClick={() => setAction(null)}>Cancel</Btn><Btn variant={action === 'reject' ? 'danger' : 'primary'} busy={busy} onClick={confirm}>Confirm</Btn></div>}>
        {action === 'reassign' ? (
          <EmployeeSearch label="New approver" value={target} onChange={(v) => setTarget(v.slice(-1))} excludeIds={request?.requester ? [request.requester.id] : []} />
        ) : (
          <Textarea label={action === 'approve' ? 'Note (optional)' : action === 'reject' ? 'Reason' : 'What needs to change'} required={action !== 'approve'} value={note} error={noteError}
            onChange={(e) => { setNote(e.target.value); setNoteError(''); }} />
        )}
      </Dialog>
    </Drawer>
  );
}
