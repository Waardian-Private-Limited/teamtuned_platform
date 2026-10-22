'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarPlus, Check, Lock, Plus, Trash2, X } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { formatDayTime } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { StatusPill } from '@/components/ui/StatusPill';
import { Textarea } from '@/components/ui/Textarea';
import * as api from '../api/perf.api';
import type { OneOnOne, OneOnOneItem } from '../types/perf.types';
import { MEETING_LABEL, meetingTone, ScheduleDialog } from './OneOnOnesPage';
import { Btn, Card, IconBtn, PageHead } from './ui';

/** One meeting: agenda, shared notes, action items, and private notes that only the viewer ever reads. */
export function OneOnOneDetailPage({ id, basePath }: { id: number; basePath: string }) {
  const router = useRouter();
  const [m, setM] = React.useState<OneOnOne | null>(null);
  const [error, setError] = React.useState('');
  const [shared, setShared] = React.useState('');
  const [mine, setMine] = React.useState('');
  const [agendaText, setAgendaText] = React.useState('');
  const [action, setAction] = React.useState<{ text: string; owner: number | null; due: string }>({ text: '', owner: null, due: '' });
  const [busy, setBusy] = React.useState('');
  const [booking, setBooking] = React.useState(false);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);

  const apply = React.useCallback((v: OneOnOne) => { setM(v); setShared(v.shared_notes); setMine(v.private_notes); }, []);
  React.useEffect(() => { api.getOneOnOne(id).then(apply).catch((e) => setError(messageOf(e))); }, [id, apply]);
  if (!m) return error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;

  const run = async (name: string, fn: () => Promise<OneOnOne>, done?: string) => {
    setBusy(name); setError('');
    try { apply(await fn()); if (done) showSuccess(done); } catch (e) { setError(messageOf(e)); } finally { setBusy(''); }
  };
  const editable = m.can_edit;
  const agenda = m.items.filter((i) => i.kind === 'agenda');
  const actions = m.items.filter((i) => i.kind === 'action');
  const people = [{ value: m.manager_employee_id, label: m.manager_name }, { value: m.employee_id, label: m.employee_name }];

  const row = (i: OneOnOneItem) => (
    <li key={i.id} className="flex items-start gap-2 py-2">
      <button type="button" disabled={!editable} aria-label={i.done ? 'Mark not done' : 'Mark done'} onClick={() => run(`t${i.id}`, () => api.updateOneOnOneItem(m.id, i.id, { done: !i.done }))}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${i.done ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line-strong bg-surface'}`}>
        {i.done && <Check className="h-3 w-3" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${i.done ? 'text-fg-muted line-through' : 'text-fg'}`}>{i.text}</p>
        {(i.owner_name || i.due_date) && <p className="text-[11px] text-fg-muted">{[i.owner_name, i.due_date ? `by ${i.due_date}` : null].filter(Boolean).join(' · ')}</p>}
      </div>
      {editable && <IconBtn label="Remove" onClick={() => run(`r${i.id}`, () => api.removeOneOnOneItem(m.id, i.id))}><Trash2 className="h-4 w-4" /></IconBtn>}
    </li>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead
        help={HELP.oneOnOnes}
        title={<><Link href={`${basePath}/one-on-ones`} aria-label="All one-on-ones" className="rounded-[var(--tt-radius-sm)] p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>One-on-one with {m.with.name}<StatusPill label={MEETING_LABEL[m.status]} tone={meetingTone(m.status)} /></>}
        subtitle={`${formatDayTime(m.scheduled_at)} · ${m.manager_name} (manager) and ${m.employee_name}`}
        actions={<>
          {m.status !== 'cancelled' && <Btn variant="secondary" icon={CalendarPlus} onClick={() => setBooking(true)}>Book the next one</Btn>}
          {m.status === 'scheduled' && <Btn icon={Check} loading={busy === 'done'} onClick={() => run('done', () => api.updateOneOnOne(m.id, { status: 'done' }), 'Marked as done')}>Mark done</Btn>}
          {m.status === 'scheduled' && <Btn variant="ghost" icon={X} onClick={() => setConfirm({ title: 'Cancel this one-on-one?', body: <p className="text-sm text-fg">{m.with.name} is not told separately; the meeting shows as cancelled.</p>, cta: 'Cancel meeting', danger: true, run: () => run('cancel', () => api.updateOneOnOne(m.id, { status: 'cancelled' }), 'Cancelled') })}>Cancel</Btn>}
          {m.status === 'cancelled' && <Btn variant="secondary" onClick={() => run('re', () => api.updateOneOnOne(m.id, { status: 'scheduled' }), 'Back on')}>Put it back on</Btn>}
        </>}
      >
        {error && <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p>}
      </PageHead>

      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto tt-scroll-hidden lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          <Card title="Agenda" note="what either of you wants to talk about">
            {agenda.length === 0 && <p className="text-xs text-fg-muted">Nothing yet.</p>}
            <ul className="divide-y divide-line/60">{agenda.map(row)}</ul>
            {editable && (
              <div className="flex gap-2">
                <div className="flex-1"><TextField label="" aria-label="New agenda point" placeholder="Add a point" value={agendaText} onChange={setAgendaText} maxLength={500} /></div>
                <Btn size="field" variant="secondary" icon={Plus} disabled={!agendaText.trim()} loading={busy === 'agenda'} onClick={() => run('agenda', async () => { const v = await api.addOneOnOneItem(m.id, { kind: 'agenda', text: agendaText }); setAgendaText(''); return v; })}>Add</Btn>
              </div>
            )}
          </Card>
          <Card title="Shared notes" note="both of you see these">
            <Textarea label="" aria-label="Shared notes" rows={6} disabled={!editable} value={shared} onChange={(e) => setShared(e.target.value)} />
            {editable && shared !== m.shared_notes && <div className="flex justify-end"><Btn size="sm" loading={busy === 'shared'} onClick={() => run('shared', () => api.updateOneOnOne(m.id, { shared_notes: shared }), 'Notes saved')}>Save notes</Btn></div>}
          </Card>
          <Card title="Action items" note={`${actions.filter((a) => !a.done).length} open · open items move to the next meeting`}>
            {actions.length === 0 && <p className="text-xs text-fg-muted">No actions yet.</p>}
            <ul className="divide-y divide-line/60">{actions.map(row)}</ul>
            {editable && (
              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_11rem_9.5rem_auto]">
                <TextField label="" aria-label="New action" placeholder="Who does what" value={action.text} onChange={(v) => setAction({ ...action, text: v })} maxLength={500} />
                <SelectField<number> label="" numeric value={action.owner} placeholder="Owner" onChange={(v) => setAction({ ...action, owner: v })} options={people} />
                <TextField label="" type="date" aria-label="Due" value={action.due} onChange={(v) => setAction({ ...action, due: v })} />
                <Btn size="field" variant="secondary" icon={Plus} disabled={!action.text.trim()} loading={busy === 'action'} onClick={() => run('action', async () => { const v = await api.addOneOnOneItem(m.id, { kind: 'action', text: action.text, owner_employee_id: action.owner, due_date: action.due || null }); setAction({ text: '', owner: null, due: '' }); return v; })}>Add</Btn>
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-3">
          <Card title={<span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Private notes</span>} note="only you ever see these">
            <Textarea label="" aria-label="Private notes" rows={10} value={mine} onChange={(e) => setMine(e.target.value)} />
            {mine !== m.private_notes && <div className="flex justify-end"><Btn size="sm" loading={busy === 'mine'} onClick={() => run('mine', () => api.savePrivateNotes(m.id, mine), 'Saved')}>Save</Btn></div>}
          </Card>
        </div>
      </div>
      {booking && <ScheduleDialog myManager={null} title="Book the next one" onClose={() => setBooking(false)} submit={(iso) => api.nextOneOnOne(m.id, iso)} onDone={(next) => { setBooking(false); router.push(`${basePath}/one-on-ones/${next}`); }} />}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
