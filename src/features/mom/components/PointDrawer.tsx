'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, ListTodo, Pencil, Send, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import { addDays, formatDate, formatDayTime, orgToday } from '@/lib/datetime';
import { useAuth } from '@/providers/auth-provider';
import { showError, showSuccess } from '@/lib/toast';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
import { Chip, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/performance/components/ui';
import * as api from '../api/mom.api';
import type { PointAction, PointDetail, PointInput } from '../api/mom.api';
import { actionLabel } from './PointRow';
import { AssignPicker, AudiencePicker, assignLabel, audienceLabel, EMPTY_AUDIENCE, EMPTY_ASSIGN, ReviewerPicker, toAssign, toAudience, type AssignValue, type AudienceValue } from './AssignPicker';
import { dueText, duePresets, KIND_LABEL, StatusTag } from './parts';

const EVENT: Record<string, string> = {
  created: 'Added', started: 'Started', submitted: 'Handed over for sign-off', confirmed: 'Confirmed', done: 'Marked done', sent_back: 'Sent back', cancelled: 'Cancelled',
  reopened: 'Reopened', reassigned: 'Owner changed', due_changed: 'Due date changed', task: 'Made a task', edited: 'Edited', deleted: 'Deleted', restored: 'Restored', acknowledged: 'Acknowledged',
};

const eventText = (e: PointDetail['events'][number]) => {
  const base = EVENT[e.kind] || e.kind;
  if (e.kind === 'reassigned') return `${base}: ${e.from || 'nobody'} to ${e.to || 'nobody'}`;
  if (e.kind === 'due_changed') return `${base}: ${e.from ? formatDate(e.from, 'short') : 'none'} to ${e.to ? formatDate(e.to, 'short') : 'none'}`;
  return e.note ? `${base}: ${e.note}` : base;
};

/** One point: where it stands and the next step, who has it and when it is due, the history and the conversation. */
export function PointDrawer({ id, basePath, onClose, onChanged }: { id: number; basePath: string; onClose: () => void; onChanged: () => void }) {
  const { organization } = useAuth();
  const tz = organization?.timezone;
  const [data, setData] = React.useState<PointDetail | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [reason, setReason] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const load = React.useCallback(() => api.point(id).then(setData).catch((e) => setError(messageOf(e))), [id]);
  React.useEffect(() => { void load(); }, [load]);

  // Every change returns the point again, so the drawer and the page behind it stay in step.
  const run = async (call: () => Promise<PointDetail>, done?: string) => {
    setBusy(true);
    try {
      setData(await call());
      onChanged();
      if (done) showSuccess(done);
      return true;
    } catch (e) {
      showError(messageOf(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const p = data?.point;
  const today = orgToday(tz);
  const taskHref = p?.task_id ? `${basePath.startsWith('/org-admin') ? '/org-admin' : '/employee'}/tasks?task=${p.task_id}` : null;

  return (
    <Drawer open onClose={onClose} title={p ? KIND_LABEL[p.kind] : 'Point'} maxWidthClassName="max-w-lg">
      {!data || !p ? (
        error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : <div className="h-64 animate-pulse rounded-lg bg-bg-subtle" aria-busy />
      ) : editing ? (
        <PointEditor point={p} today={today} onCancel={() => setEditing(false)}
          onSave={async (body) => { if (await run(() => api.updatePoint(p.id, body), 'Saved')) setEditing(false); }} busy={busy} />
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-base font-bold leading-snug text-fg">{p.text}</p>
            <Link href={`${basePath}/meetings/${p.meeting_id}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg">
              {data.meeting.title}<ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          </div>

          {p.deleted && (
            <div className="space-y-2 rounded-xl border border-line bg-bg-subtle p-3">
              <p className="text-sm font-semibold text-fg">Deleted{p.deleted_by_name ? ` by ${p.deleted_by_name}` : ''}{p.deleted_at ? ` · ${formatDayTime(p.deleted_at, tz)}` : ''}</p>
              {p.delete_reason && <p className="text-xs text-fg-muted">Reason: {p.delete_reason}</p>}
              <p className="text-xs text-fg-muted">It is kept for the audit trail and hidden from everyone else.</p>
              {p.can_restore && <Btn size="sm" loading={busy} onClick={() => run(() => api.restorePoint(p.id), 'Restored')}>Restore</Btn>}
            </div>
          )}

          {p.kind === 'action' && (
            <>
              <dl className="grid grid-cols-2 gap-3 rounded-xl border border-line p-3 text-sm">
                <Fact label="Status">{p.status && <StatusTag status={p.status} />}</Fact>
                <Fact label="Assigned to">{assignLabel(p) || 'Not assigned'}</Fact>
                <Fact label="Due"><span className={cx(p.due_bucket === 'overdue' && 'font-semibold text-[var(--tt-danger)]')}>{p.due_on ? `${p.due_on === today || p.due_on === addDays(today, 1) ? `${dueText(p.due_on, today)} · ${formatDate(p.due_on, 'short')}` : formatDate(p.due_on, 'medium')}` : 'No date'}</span></Fact>
                <Fact label="Priority">{p.priority === 'high' ? 'High' : 'Normal'}</Fact>
                {p.needs_signoff && <Fact label="Signs off">{p.signoff_name || 'The organizer'}</Fact>}
                {p.task_id && <Fact label="Task">{taskHref && <Link href={taskHref} className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"><ListTodo className="h-3.5 w-3.5" aria-hidden />Open the task</Link>}</Fact>}
              </dl>

              {p.owners.length > 1 && (
                <p className="text-xs text-fg-muted">
                  {p.assign_mode === 'shared' ? 'Any one of them can complete it: ' : ''}{p.owners.map((o) => o.name).join(', ')}
                </p>
              )}
              {p.group_id && <p className="text-xs text-fg-muted">This is one person&apos;s copy. Each person on it has their own.</p>}
              {p.task_id && <p className="text-xs text-fg-muted">This action is a task now. Its status follows the task.</p>}

              {(p.allowed_actions.length > 0 || data.access.can_make_task) && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {p.allowed_actions.filter((a) => a !== 'send_back' && a !== 'cancel').map((a, i, list) => (
                      <Btn key={a} loading={busy} variant={i === list.length - 1 ? 'primary' : 'secondary'} onClick={() => run(() => api.pointAction(p.id, a))}>{actionLabel(p, a)}</Btn>
                    ))}
                    {p.allowed_actions.includes('send_back') && <Btn variant="secondary" disabled={busy} onClick={() => setReason('')}>Send back</Btn>}
                    {data.access.can_make_task && <Btn variant="secondary" icon={ListTodo} disabled={busy} onClick={() => run(() => api.makeTask(p.id), 'Converted to task')}>Convert to task</Btn>}
                    {p.allowed_actions.includes('cancel') && <Btn variant="ghost" disabled={busy} onClick={() => setConfirm({ title: 'Cancel this action?', body: 'It stays on the minutes as cancelled.', cta: 'Cancel action', danger: true, run: () => run(() => api.pointAction(p.id, 'cancel')) })}>Cancel action</Btn>}
                  </div>
                  {reason !== null && (
                    <div className="space-y-2 rounded-xl border border-line p-3">
                      <Textarea label="What needs to change?" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                      <div className="flex gap-2">
                        <Btn loading={busy} disabled={!reason.trim()} onClick={async () => { if (await run(() => api.pointAction(p.id, 'send_back', reason))) setReason(null); }}>Send back</Btn>
                        <Btn variant="ghost" onClick={() => setReason(null)}>Close</Btn>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {p.kind !== 'action' && (
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-line p-3 text-sm">
              <Fact label="Shared with">{audienceLabel(p) ?? 'People at the meeting'}</Fact>
            </dl>
          )}

          {p.kind === 'decision' && p.needs_ack && (
            <div className="space-y-2 rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-fg">Acknowledged {p.ack_count} of {p.ack_total}</p>
                {p.can_ack && <Btn size="sm" loading={busy} onClick={() => run(() => api.acknowledgePoint(p.id), 'Acknowledged')}>Acknowledge</Btn>}
                {p.acked_by_me && <span className="text-xs font-semibold text-fg-muted">You acknowledged</span>}
              </div>
              {data.acks && (
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div><p className="mb-1 font-semibold text-fg-muted">Acknowledged</p>{data.acks.acked.length ? data.acks.acked.map((a) => <p key={a.employee_id} className="text-fg">{a.name}<span className="text-fg-muted"> · {formatDayTime(a.at, tz)}</span></p>) : <p className="text-fg-muted">Nobody yet</p>}</div>
                  <div><p className="mb-1 font-semibold text-fg-muted">Waiting</p>{data.acks.pending.length ? data.acks.pending.map((a) => <p key={a.employee_id} className="text-fg">{a.name}</p>) : <p className="text-fg-muted">Everyone has</p>}</div>
                </div>
              )}
            </div>
          )}

          {p.can_delete && deleting === null && (
            <div className="flex gap-2">
              <Btn variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Btn>
              <Btn variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleting('')}>Delete</Btn>
            </div>
          )}
          {deleting !== null && (
            <div className="space-y-2 rounded-xl border border-line p-3">
              <Textarea label="Why is it being deleted? (optional)" rows={2} maxLength={500} value={deleting} onChange={(e) => setDeleting(e.target.value)} hint="The point is kept for the audit trail, with your name and this reason." />
              <div className="flex gap-2">
                <Btn variant="danger" size="sm" loading={busy} onClick={async () => {
                  setBusy(true);
                  try { await api.deletePoint(p.id, deleting.trim()); onChanged(); onClose(); } catch (e) { showError(messageOf(e)); setBusy(false); }
                }}>Delete point</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setDeleting(null)}>Keep it</Btn>
              </div>
            </div>
          )}

          {data.versions.length > 1 && <Versions versions={data.versions} tz={tz} />}

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">History</h3>
            <ol className="space-y-1.5 border-l border-line pl-3">
              {data.events.map((e) => (
                <li key={e.id} className="text-xs text-fg"><span className="font-semibold">{eventText(e)}</span><span className="text-fg-muted"> · {e.actor || 'System'} · {formatDayTime(e.at, tz)}</span></li>
              ))}
            </ol>
          </section>

          <Comments data={data} busy={busy} tz={tz} onSend={(body, mentions) => run(() => api.comment(p.id, body, mentions))} />
        </div>
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </Drawer>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-fg">{children}</dd>
    </div>
  );
}

function Comments({ data, busy, tz, onSend }: { data: PointDetail; busy: boolean; tz?: string | null; onSend: (body: string, mentions: number[]) => Promise<boolean> }) {
  const [text, setText] = React.useState('');
  const [mentions, setMentions] = React.useState<number[]>([]);
  const [pickMention, setPickMention] = React.useState(false);
  const send = async () => {
    if (!text.trim()) return;
    if (await onSend(text.trim(), mentions)) { setText(''); setMentions([]); setPickMention(false); }
  };
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Comments{data.comments.length ? ` · ${data.comments.length}` : ''}</h3>
      <ul className="space-y-3">
        {data.comments.map((c) => (
          <li key={c.id} className="rounded-xl bg-bg-subtle px-3 py-2">
            <p className="text-xs font-semibold text-fg">{c.name}<span className="font-normal text-fg-muted"> · {formatDayTime(c.at, tz)}</span></p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-fg">{c.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-2">
        <Textarea label="" aria-label="Write a comment" rows={2} maxLength={2000} placeholder="Write a comment" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void send(); }} />
        {pickMention && (
          <div className="flex flex-wrap gap-1.5" aria-label="Who to mention">
            {data.participants.map((x) => (
              <Chip key={x.employee_id} active={mentions.includes(x.employee_id)} onClick={() => setMentions(mentions.includes(x.employee_id) ? mentions.filter((m) => m !== x.employee_id) : [...mentions, x.employee_id])}>{x.name}</Chip>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <Btn variant="ghost" size="sm" onClick={() => setPickMention(!pickMention)}>{mentions.length ? `Mentioning ${mentions.length}` : '@ Mention'}</Btn>
          <Btn size="sm" icon={Send} loading={busy} disabled={!text.trim()} onClick={send}>Send</Btn>
        </div>
      </div>
    </section>
  );
}

/** The assign control's starting value: the group that was picked, or the people who own it now. */
function assignOf(point: PointDetail['point']): AssignValue {
  const t = point.assign_target;
  if (t && t.kind === 'group' && point.assign_mode !== 'separate') {
    return { ...EMPTY_ASSIGN, tab: t.departments.length ? 'department' : 'site', departmentIds: t.departments.map((d) => d.id), siteIds: t.sites.map((x) => x.id) };
  }
  return { ...EMPTY_ASSIGN, people: point.owners.map((o) => ({ id: o.employee_id, name: o.name, employee_code: null })) };
}

function PointEditor({ point, today, busy, onCancel, onSave }: { point: PointDetail['point']; today: string; busy: boolean; onCancel: () => void; onSave: (body: Partial<PointInput>) => void }) {
  const isAction = point.kind === 'action';
  const [text, setText] = React.useState(point.text);
  const [assign, setAssign] = React.useState<AssignValue>(() => assignOf(point));
  const [assignChanged, setAssignChanged] = React.useState(false);
  const [due, setDue] = React.useState(point.due_on || '');
  const [high, setHigh] = React.useState(point.priority === 'high');
  const [signoff, setSignoff] = React.useState(point.needs_signoff);
  const [ack, setAck] = React.useState(point.needs_ack);
  const [audience, setAudience] = React.useState<AudienceValue | null>(null);
  const [reviewer, setReviewer] = React.useState<{ id: number; name: string; employee_code: string | null } | null>(point.signoff_employee_id ? { id: point.signoff_employee_id, name: point.signoff_name || 'Reviewer', employee_code: null } : null);
  const locked = Boolean(point.task_id);
  return (
    <div className="space-y-4">
      <TextField label="Point" required value={text} onChange={setText} maxLength={1000} />
      {isAction && (
        <>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-fg">Assigned to</p>
            {locked
              ? <p className="text-sm text-fg-muted">{point.owner_name}. Change the assignee on the task.</p>
              : <AssignPicker value={assign} onChange={(v) => { setAssign(v); setAssignChanged(true); }} allowSeparate={false} single={Boolean(point.group_id)} />}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-fg">Due</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {duePresets(today).map((d) => <Chip key={d.value} active={due === d.value} onClick={() => setDue(d.value)}>{d.label}</Chip>)}
              <input type="date" aria-label="Pick a date" value={due} min={point.due_on && point.due_on < today ? point.due_on : today} onChange={(e) => setDue(e.target.value)} className="h-8 rounded-lg border border-line bg-surface px-2 text-xs text-fg" />
              {due && <Btn variant="ghost" size="sm" onClick={() => setDue('')}>Clear</Btn>}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5"><span className="text-sm font-semibold text-fg">High priority</span><Switch checked={high} onChange={setHigh} label="High priority" /></div>
          {!locked && <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5"><span className="text-sm font-semibold text-fg">Needs sign-off when done</span><Switch checked={signoff} onChange={(v) => { setSignoff(v); if (!v) setReviewer(null); }} label="Needs sign-off" /></div>}
          {!locked && signoff && <ReviewerPicker value={reviewer} onChange={setReviewer} />}
        </>
      )}
      {point.kind === 'decision' && <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5"><span className="text-sm font-semibold text-fg">Ask people at the meeting to acknowledge</span><Switch checked={ack} onChange={setAck} label="Ask for acknowledgement" /></div>}
      {point.kind !== 'action' && (
        audience
          ? <AudiencePicker value={audience} onChange={setAudience} />
          : (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
              <span className="text-sm text-fg"><span className="font-semibold">Shared with: </span>{audienceLabel(point) ?? 'People at the meeting'}</span>
              <Btn variant="ghost" size="sm" onClick={() => setAudience(EMPTY_AUDIENCE)}>Change</Btn>
            </div>
          )
      )}
      <div className="flex gap-2">
        <Btn loading={busy} disabled={!text.trim()} onClick={() => onSave({
          text,
          ...(point.kind === 'decision' ? { needs_ack: ack } : {}),
          ...(point.kind !== 'action' && audience ? { audience: toAudience(audience) ?? null } : {}),
          ...(isAction ? { due_on: due || null, priority: high ? 'high' : 'normal', needs_signoff: signoff, signoff_employee_id: signoff ? reviewer?.id ?? null : null, ...(assignChanged && !locked ? { assign: toAssign({ ...assign, mode: 'shared' }) } : {}) } : {}),
        })}>Save</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

/** Every saved version of the point, newest first, with who changed what: from, to. */
function Versions({ versions, tz }: { versions: PointDetail['versions']; tz?: string | null }) {
  const [open, setOpen] = React.useState(false);
  return (
    <section>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mb-2 flex w-full items-center justify-between text-xs font-bold uppercase tracking-wide text-fg-muted hover:text-fg">
        <span>Versions · {versions.length}</span>
        <span className="text-[11px] font-semibold normal-case">{open ? 'Hide' : 'Show edits'}</span>
      </button>
      {open && (
        <ol className="space-y-2">
          {versions.map((v) => (
            <li key={v.version} className="rounded-xl border border-line p-3">
              <p className="text-xs font-semibold text-fg">Version {v.version}{v.version === versions[0].version ? ' · current' : ''}<span className="font-normal text-fg-muted"> · {v.editor || 'System'} · {formatDayTime(v.at, tz)}</span></p>
              {v.version === 1 && v.changes.length === 0 && <p className="mt-1 text-xs text-fg-muted">As first written: “{v.snapshot.text}”</p>}
              <ul className="mt-1 space-y-1">
                {v.changes.map((c) => (
                  <li key={c.field} className="text-xs text-fg"><span className="font-semibold">{c.label}:</span> <span className="text-fg-muted line-through">{c.from || 'none'}</span> → <span className="font-semibold">{c.to || 'none'}</span></li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
