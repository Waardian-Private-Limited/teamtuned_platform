'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarClock, Clock, Download, MapPin, Paperclip, Send, Star, User, UserCheck } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { messageOf, ApiError } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { Btn, Card, Skeleton, inputCls } from '@/features/data-collection/components/shared/Ui';
import { FormRenderer } from '@/features/data-collection/components/renderer/FormRenderer';
import { useDevicePosition } from '@/features/data-collection/components/renderer/SystemFields';
import * as dcApi from '@/features/data-collection/api/dc.api';
import { newUuid, validate } from '@/features/data-collection/utils/schema';
import type { Attachment, Errors, Values } from '@/features/data-collection/types/dc.types';
import * as api from '../api/tm.api';
import { STATUS_LABEL, actionLabel, dueText, duration } from '../constants/tm.constants';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import type { ActivityRow, PersonOption, TaskAction } from '../types/tm.types';
import { ApproveDialog, ReturnDialog } from './TaskDialogs';
import { PersonPicker } from './PersonPicker';
import { PriorityMark, StatusPill } from './TaskParts';

const PRIMARY: TaskAction[] = ['start', 'acknowledge', 'resume', 'submit', 'approve'];
const stamp = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function activityText(a: ActivityRow): string {
  if (a.kind === 'created') return 'created the task';
  if (a.kind === 'edit') return 'edited the task';
  if (a.kind === 'assign') return 'changed the assignee';
  if (a.kind === 'status') {
    const to = a.meta?.to ? STATUS_LABEL[a.meta.to as keyof typeof STATUS_LABEL] || a.meta.to : '';
    return `moved it to ${to || 'a new state'}`;
  }
  return 'wrote a note';
}

function Meta({ icon: Icon, children, danger }: { icon: typeof User; children: React.ReactNode; danger?: boolean }) {
  return <span className={cx('inline-flex min-w-0 items-center gap-1.5 text-xs', danger ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted')}><Icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{children}</span></span>;
}

/** Everything about one task: who, when, the buttons this person may press, required data, checklist, files and the activity feed. */
export function TaskDrawer({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged?: () => void }) {
  const { data, loading, error, refetch, setData } = useAsync(() => api.getTask(id as number), [id], id !== null);
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<TaskAction | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [returning, setReturning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [posting, setPosting] = useState(false);
  const [newOwner, setNewOwner] = useState<PersonOption[]>([]);
  const uuid = useRef(newUuid());
  const seeded = useRef<number | null>(null);
  const needsData = Boolean(data?.form && data.allowed_actions.includes('submit'));
  const where = useDevicePosition(needsData);

  useEffect(() => {
    if (!data || seeded.current === data.id) return;
    seeded.current = data.id;
    setValues(data.form?.values || {});
    setErrors({});
  }, [data]);
  useEffect(() => { if (id === null) { seeded.current = null; setData(null); setNote(''); setFiles([]); } }, [id, setData]);

  const changed = useCallback(() => onChanged?.(), [onChanged]);

  const run = async (action: TaskAction, body: { note?: string; rating?: number } = {}, extra: { values?: Values } = {}) => {
    if (!data) return;
    setBusy(action);
    try {
      const next = await api.act(data.id, action, { ...body, ...extra, ...(extra.values ? { client_uuid: uuid.current, captured_at: new Date().toISOString(), geo: where.geo } : {}) });
      setData(next);
      seeded.current = null;
      uuid.current = newUuid();
      changed();
      showSuccess(`${STATUS_LABEL[next.status]}`);
    } catch (e) {
      const server = e instanceof ApiError ? (e.data as { details?: { errors?: Errors } })?.details?.errors : undefined;
      if (server) { setErrors(server); showError('Fix the highlighted fields'); } else showError(messageOf(e));
      throw e;
    } finally { setBusy(null); }
  };

  const press = (a: TaskAction) => {
    if (!data) return;
    if (a === 'return') { setReturning(true); return; }
    if (a === 'approve') { setApproving(true); return; }
    if (a === 'cancel') { setConfirm({ title: 'Cancel this task?', cta: 'Cancel task', danger: true, body: 'The assignee is told it was cancelled. You can reopen it later.', run: () => run('cancel').catch(() => undefined) }); return; }
    if (a === 'reopen') { setConfirm({ title: 'Reopen this task?', cta: 'Reopen', body: 'It goes back to the assignee.', run: () => run('reopen').catch(() => undefined) }); return; }
    if (a === 'submit' && data.form) {
      const local = validate(data.form.schema.fields, values);
      setErrors(local);
      if (Object.keys(local).length) { showError('Fill the required data first'); return; }
      void run('submit', {}, { values }).catch(() => undefined);
      return;
    }
    void run(a).catch(() => undefined);
  };

  const toggle = async (itemId: number, done: boolean) => {
    if (!data) return;
    setData({ ...data, checklist: data.checklist.map((c) => (c.id === itemId ? { ...c, done } : c)) });
    try { await api.toggleItem(data.id, itemId, done); changed(); } catch (e) { showError(messageOf(e)); void refetch(); }
  };

  const post = async () => {
    if (!data || (!note.trim() && !files.length)) return;
    setPosting(true);
    try { await api.comment(data.id, note.trim(), files); setNote(''); setFiles([]); await refetch(); } catch (e) { showError(messageOf(e)); } finally { setPosting(false); }
  };

  const attach = async (f: File | undefined) => {
    if (!f) return;
    try { const a = await api.uploadAttachment(f); setFiles((p) => [...p, a]); } catch (e) { showError(messageOf(e)); }
  };

  const reassign = async () => {
    if (!data || !newOwner[0]) return;
    try { setData(await api.reassign(data.id, newOwner[0].id)); setNewOwner([]); changed(); showSuccess('Reassigned'); } catch (e) { showError(messageOf(e)); }
  };

  const editable = Boolean(data?.form) && Boolean(data?.allowed_actions.includes('submit'));
  const closed = data ? ['done', 'cancelled'].includes(data.status) : false;
  const canCheck = Boolean(data && (data.roles.assignee || data.roles.manager) && !closed);
  const actions = data ? [...data.allowed_actions].sort((a, b) => (PRIMARY.includes(b) ? 1 : 0) - (PRIMARY.includes(a) ? 1 : 0) || PRIMARY.indexOf(a) - PRIMARY.indexOf(b)) : [];

  return (
    <Drawer open={id !== null} onClose={onClose} title="Task" maxWidthClassName="sm:max-w-2xl">
      {loading && !data ? <div className="space-y-3"><Skeleton className="h-8" /><Skeleton className="h-24" /><Skeleton className="h-40" /></div>
        : error || !data ? <p className="text-sm text-[var(--tt-danger)]">{error || 'This task is not available'}</p> : (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2"><StatusPill status={data.status} /><PriorityMark priority={data.priority} withLabel />{data.overdue && <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--tt-danger)]"><AlertTriangle className="h-3.5 w-3.5" />Overdue</span>}</div>
              <h2 className="mt-2 text-lg font-bold leading-snug text-fg">{data.title}</h2>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <Meta icon={User}>For {data.assignee_name || '—'}</Meta>
                <Meta icon={UserCheck}>{data.requires_review ? `Reviewed by ${data.reviewer_name || 'a manager'}` : 'No review needed'}</Meta>
                <Meta icon={CalendarClock} danger={data.overdue}>{dueText(data.due_at)}</Meta>
                {data.site_name && <Meta icon={MapPin}>{data.site_name}</Meta>}
                {data.time_spent_seconds > 0 && <Meta icon={Clock}>{duration(data.time_spent_seconds)} worked</Meta>}
                {data.review_rating && <Meta icon={Star}>{data.review_rating} of 5</Meta>}
              </div>
              {data.labels.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{data.labels.map((l) => <span key={l} className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-[11px] font-semibold text-fg-muted">{l}</span>)}</div>}
            </div>

            {actions.length > 0 && (
              <div className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-2 rounded-xl border border-line bg-surface/95 p-2 backdrop-blur">
                {actions.map((a) => (
                  <Btn key={a} variant={PRIMARY.includes(a) && a === actions[0] ? 'primary' : a === 'cancel' ? 'ghost' : 'secondary'} busy={busy === a} disabled={busy !== null} onClick={() => press(a)}>{actionLabel(a, data.requires_review)}</Btn>
                ))}
              </div>
            )}

            {data.description && <p className="whitespace-pre-wrap text-sm text-fg">{data.description}</p>}

            {data.checklist.length > 0 && (
              <Card title="Checklist" subtitle={`${data.checklist.filter((c) => c.done).length} of ${data.checklist.length} done`}>
                <ul className="space-y-2">{data.checklist.map((c) => (
                  <li key={c.id}><label className={cx('flex items-start gap-2.5 text-sm', canCheck ? 'cursor-pointer' : 'opacity-70')}>
                    <input type="checkbox" disabled={!canCheck} checked={c.done} onChange={(e) => void toggle(c.id, e.target.checked)} className="mt-0.5 h-4 w-4 accent-black" />
                    <span className={c.done ? 'text-fg-muted line-through' : 'text-fg'}>{c.text}</span></label></li>
                ))}</ul>
              </Card>
            )}

            {data.form && (
              <Card title="Required data" subtitle={editable ? 'Fill this in before you finish the task' : data.form.values ? 'What was submitted' : 'Filled by the assignee'}>
                {editable || data.form.values ? (
                  <FormRenderer schema={data.form.schema} values={editable ? values : data.form.values || {}} onChange={setValues} errors={errors} env={{ upload: (f) => dcApi.uploadAttachment(f), readOnly: !editable }}
                    system={editable ? undefined : { name: data.assignee_name, at: data.submitted_at, geo: null }} />
                ) : <p className="text-xs text-fg-muted">Nothing has been filled in yet.</p>}
                {editable && where.error && !where.geo && <p className="mt-2 text-xs text-[var(--tt-danger)]">{where.error} · <button type="button" onClick={where.retry} className="font-semibold underline">Retry</button></p>}
              </Card>
            )}

            {data.attachments.length > 0 && (
              <Card title="Files">
                <ul className="space-y-1.5">{data.attachments.map((a) => (
                  <li key={a.key || a.name}><a href={a.url || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-fg underline-offset-4 hover:underline"><Paperclip className="h-3.5 w-3.5" />{a.name}<Download className="h-3.5 w-3.5 text-fg-muted" /></a></li>
                ))}</ul>
              </Card>
            )}

            {data.roles.manager && !closed && (
              <Card title="Reassign" subtitle="Hand this task to someone else">
                <div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><PersonPicker value={newOwner} onChange={setNewOwner} placeholder="Search a person" /></div><Btn disabled={!newOwner[0]} onClick={reassign}>Reassign</Btn></div>
              </Card>
            )}

            <Card title="Activity">
              <div className="mb-4">
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" aria-label="Add a note" className={cx(inputCls(), 'h-auto py-2')} />
                {files.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5">{files.map((f) => <li key={f.key} className="rounded-full border border-line bg-bg-subtle px-2.5 py-0.5 text-xs font-semibold">{f.name}</li>)}</ul>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-fg"><Paperclip className="h-3.5 w-3.5" />Attach<input type="file" className="hidden" accept="image/png,image/jpeg,application/pdf" onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ''; }} /></label>
                  <Btn variant="primary" busy={posting} disabled={!note.trim() && !files.length} icon={<Send className="h-3.5 w-3.5" />} onClick={post}>Post</Btn>
                </div>
              </div>
              <ol className="space-y-3">
                {data.activity.map((a) => (
                  <li key={a.id} className="text-sm">
                    <div className="text-xs text-fg-muted"><span className="font-semibold text-fg">{a.actor_name || 'Someone'}</span> {activityText(a)} · {stamp(a.created_at)}</div>
                    {a.body && <p className={cx('mt-1 whitespace-pre-wrap', a.kind === 'comment' ? 'rounded-lg bg-bg-subtle px-3 py-2 text-fg' : 'text-fg-muted')}>{a.body}</p>}
                    {a.meta?.attachments?.map((f) => <span key={f.key} className="mr-1.5 mt-1 inline-flex items-center gap-1 text-xs font-semibold text-fg-muted"><Paperclip className="h-3 w-3" />{f.name}</span>)}
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        )}
      <ReturnDialog open={returning} onClose={() => setReturning(false)} onSend={(n) => run('return', { note: n })} />
      <ApproveDialog open={approving} onClose={() => setApproving(false)} onApprove={(r) => run('approve', r ? { rating: r } : {})} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </Drawer>
  );
}

