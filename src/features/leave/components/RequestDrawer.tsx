'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { StatusPill } from '@/components/ui/StatusPill';
import { Alert } from '@/components/ui/Alert';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/leave.api';
import type { LeaveRequestDetail } from '../types/leave';
import { SESSION_LABEL, STATUS_TONE, days, fmtDate, range, todayIso } from '../utils/format';

interface Props {
  id: number | null;
  /** admin: approve / reject / cancel any request in scope; self: only the owner's cancel. */
  mode: 'admin' | 'self';
  canApprove?: boolean;
  canEdit?: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function RequestDrawer({ id, mode, canApprove, canEdit, onClose, onChanged }: Props) {
  const [d, setD] = React.useState<LeaveRequestDetail | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [noteError, setNoteError] = React.useState('');

  const load = React.useCallback(() => {
    if (!id) return;
    setError('');
    (mode === 'admin' ? api.getRequest(id) : api.myRequest(id)).then(setD).catch((e) => setError(messageOf(e)));
  }, [id, mode]);
  React.useEffect(() => { setD(null); setNote(''); setNoteError(''); load(); }, [load]);

  async function act(kind: 'approve' | 'reject' | 'cancel') {
    if (!d) return;
    if (kind === 'reject' && !note.trim()) { setNoteError('Give a reason for rejecting'); return; }
    setBusy(true);
    try {
      const next = kind === 'approve' ? await api.approve(d.id, note || undefined)
        : kind === 'reject' ? await api.reject(d.id, note)
        : mode === 'admin' ? await api.cancel(d.id, note || undefined) : await api.myCancel(d.id, note || undefined);
      setD(next);
      showSuccess(kind === 'approve' ? 'Approved' : kind === 'reject' ? 'Rejected' : 'Cancelled');
      onChanged();
    } catch (e) { showError(messageOf(e)); } finally { setBusy(false); }
  }

  const mayDecide = d?.status === 'Pending' && Boolean(d.approval_can_decide || (mode === 'admin' && canApprove));
  const canCancel = d && (d.status === 'Pending' || (d.status === 'Approved' && (mode === 'admin' ? canEdit : d.start_date > todayIso())));
  const btn = 'h-9 rounded-lg px-4 text-sm font-semibold disabled:opacity-60';

  return (
    <Drawer open={id !== null} onClose={onClose} title="Leave request">
      <div className="space-y-5 p-4 sm:p-6">
        {error && <Alert message={error} tone="error" />}
        {!d && !error && <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />}
        {d && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold tracking-tight text-fg">{d.employee.name}</p>
                <p className="text-xs text-fg-muted">{d.employee.code ?? ''}</p>
              </div>
              <StatusPill label={d.status} tone={STATUS_TONE[d.status]} />
            </div>

            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3.5 text-sm">
              <div><dt className="text-xs text-fg-muted">Leave type</dt><dd className="font-semibold text-fg">{d.leave_type.name}</dd></div>
              <div><dt className="text-xs text-fg-muted">Days</dt><dd className="font-semibold text-fg">{days(d.charged_days)}{d.lop_days > 0 && <span className="ml-1 text-xs text-[var(--tt-danger)]">({days(d.lop_days)} unpaid)</span>}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-fg-muted">Dates</dt><dd className="font-semibold text-fg">{range(d.start_date, d.end_date)}</dd>
                {(d.start_session !== 'full' || d.end_session !== 'full') && <dd className="text-xs text-fg-muted">{SESSION_LABEL[d.start_session]}{d.start_date !== d.end_date && ` → ${SESSION_LABEL[d.end_session]}`}</dd>}</div>
              {d.reason && <div className="col-span-2"><dt className="text-xs text-fg-muted">Reason</dt><dd className="text-fg">{d.reason}</dd></div>}
              {d.rejection_reason && <div className="col-span-2"><dt className="text-xs text-fg-muted">Rejected because</dt><dd className="text-fg">{d.rejection_reason}</dd></div>}
              {d.cancel_reason && <div className="col-span-2"><dt className="text-xs text-fg-muted">Cancelled because</dt><dd className="text-fg">{d.cancel_reason}</dd></div>}
            </dl>

            {d.balance_impact.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-bold text-fg">Balance impact</h4>
                <ul className="space-y-1.5">
                  {d.balance_impact.map((b) => (
                    <li key={b.leave_type_id} className="flex justify-between rounded-lg border border-line px-3 py-2 text-sm">
                      <span className="text-fg">{b.name}</span>
                      <span className="font-semibold text-fg">{b.held > 0 ? `${days(b.held)} reserved` : `${days(b.used)} used`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="mb-2 text-sm font-bold text-fg">Day by day</h4>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(new Set(d.days.map((x) => x.date))).map((date) => {
                  const rows = d.days.filter((x) => x.date === date);
                  const live = rows.some((r) => r.state === 'active');
                  return (
                    <span key={date} className={`rounded-md border px-2 py-1 text-[11px] ${live ? 'border-line text-fg' : 'border-dashed border-line text-fg-subtle line-through'}`}>
                      {fmtDate(date).replace(/ \d{4}$/, '')}{rows.length === 1 && rows[0].slot ? (rows[0].slot === 1 ? ' · AM' : ' · PM') : ''}{rows.some((r) => r.is_lop) ? ' · unpaid' : ''}
                    </span>
                  );
                })}
              </div>
            </div>

            {d.timeline.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-bold text-fg">Approval</h4>
                <ol className="space-y-2 border-l border-line pl-4">
                  {d.timeline.map((t, i) => (
                    <li key={i} className="text-sm">
                      <p className="font-semibold capitalize text-fg">{(t.level_name ?? `Level ${t.level_number ?? i + 1}`)} · {String(t.action).replace(/_/g, ' ')}</p>
                      {t.approver_name && <p className="text-xs text-fg-muted">{t.approver_name}</p>}
                      {t.remarks && <p className="text-xs text-fg-muted">“{t.remarks}”</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {(canCancel || mayDecide) && (
              <div className="space-y-3 border-t border-line pt-4">
                <div>
                  <input
                    value={note} onChange={(e) => { setNote(e.target.value); setNoteError(''); }} placeholder="Note or reason"
                    aria-invalid={Boolean(noteError) || undefined}
                    className={`h-10 w-full rounded-lg border bg-surface px-3 text-sm text-fg outline-none ${noteError ? 'border-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)]'}`}
                  />
                  {noteError && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{noteError}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {mayDecide && (
                    <>
                      <button type="button" disabled={busy} onClick={() => act('approve')} className={`${btn} bg-[var(--tt-primary)] text-[var(--tt-on-primary)]`}>Approve</button>
                      <button type="button" disabled={busy} onClick={() => act('reject')} className={`${btn} border border-[var(--tt-danger)] text-[var(--tt-danger)]`}>Reject</button>
                    </>
                  )}
                  {canCancel && <button type="button" disabled={busy} onClick={() => act('cancel')} className={`${btn} border border-line text-fg hover:bg-bg-subtle`}>{d.status === 'Pending' ? 'Withdraw request' : 'Cancel leave'}</button>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
