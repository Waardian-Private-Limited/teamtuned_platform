'use client';

import React from 'react';
import { fieldErrorsOf } from '@/lib/api/errors';
import { orgToday, orgWallOf, orgWallToIso } from '@/lib/datetime';
import { useAuth } from '@/providers/auth-provider';
import { Dialog } from '@/components/ui/Dialog';
import { FieldMessage, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { PersonPicker } from '@/features/task-management/components/PersonPicker';
import type { PersonOption } from '@/features/task-management/types/tm.types';
import { Btn } from '@/features/performance/components/ui';
import * as api from '../api/mom.api';
import type { MeetingDetail } from '../api/mom.api';

type Errors = Partial<Record<'title' | 'starts_at' | 'ends_at' | 'attendee_ids' | 'organizer_employee_id' | 'agenda', string>>;

const fieldCls = (error?: string) => `h-10 w-full rounded-lg border bg-surface px-3 text-sm text-fg outline-none focus:border-[var(--tt-primary)] ${error ? 'border-[var(--tt-danger)]' : 'border-line'}`;

/**
 * Schedule or change a meeting. Times are read in the organization's zone, not the browser's. HR (`canManage`) may name the
 * organizer; the org admin account has no employee record, so it must.
 */
export function MeetingEditor({ detail, canManage, hasEmployee, presetStart, onClose, onSaved }: {
  detail?: MeetingDetail | null; canManage: boolean; hasEmployee: boolean; presetStart?: string; onClose: () => void; onSaved: (d: MeetingDetail) => void;
}) {
  const { organization } = useAuth();
  const tz = organization?.timezone;
  const editing = Boolean(detail);
  const first = detail ? orgWallOf(detail.meeting.starts_at, tz) : presetStart ? orgWallOf(presetStart, tz) : { date: orgToday(tz), time: '10:00' };
  const [title, setTitle] = React.useState(detail?.meeting.title || '');
  const [date, setDate] = React.useState(first.date);
  const [start, setStart] = React.useState(first.time);
  const [end, setEnd] = React.useState(detail?.meeting.ends_at ? orgWallOf(detail.meeting.ends_at, tz).time : '');
  const [place, setPlace] = React.useState(detail?.meeting.place || '');
  const [agenda, setAgenda] = React.useState(detail?.meeting.agenda || '');
  const [organizer, setOrganizer] = React.useState<PersonOption[]>([]);
  const [people, setPeople] = React.useState<PersonOption[]>(
    (detail?.attendees || []).filter((a) => a.role !== 'organizer').map((a) => ({ id: a.employee_id, name: a.name, employee_code: a.employee_code }))
  );
  const [errors, setErrors] = React.useState<Errors>({});
  const [general, setGeneral] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const search = React.useCallback((q: string) => api.people(q), []);
  const clear = (k: keyof Errors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  const save = async () => {
    const startsAt = orgWallToIso(date, start, tz);
    const endsAt = end ? orgWallToIso(date, end, tz) : null;
    if (!startsAt) { setErrors({ starts_at: 'Choose when it starts' }); return; }
    if (endsAt && Date.parse(endsAt) < Date.parse(startsAt)) { setErrors({ ends_at: 'It ends before it starts' }); return; }
    setBusy(true); setErrors({}); setGeneral('');
    const body = {
      title, starts_at: startsAt, ends_at: endsAt, place, agenda, attendee_ids: people.map((p) => p.id),
      ...(canManage && organizer[0] && !editing ? { organizer_employee_id: organizer[0].id } : {}),
    };
    try {
      onSaved(detail ? await api.updateMeeting(detail.meeting.id, body) : await api.createMeeting(body));
    } catch (e) {
      const r = fieldErrorsOf(e); setErrors(r.fields as Errors); setGeneral(r.general);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} title={editing ? 'Edit meeting' : 'New meeting'} maxWidthClassName="max-w-xl"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>{editing ? 'Save' : 'Schedule'}</Btn></>}>
      <div className="space-y-4">
        <TextField label="Title" required value={title} onChange={(v) => { setTitle(v); clear('title'); }} placeholder="e.g. Weekly operations review" maxLength={200} error={errors.title} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="col-span-2 block sm:col-span-1">
            <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Date</span>
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); clear('starts_at'); }} className={fieldCls(errors.starts_at)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Starts</span>
            <input type="time" value={start} onChange={(e) => { setStart(e.target.value); clear('starts_at'); }} className={fieldCls(errors.starts_at)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Ends <span className="font-normal text-fg-muted">(optional)</span></span>
            <input type="time" value={end} onChange={(e) => { setEnd(e.target.value); clear('ends_at'); }} className={fieldCls(errors.ends_at)} />
          </label>
        </div>
        {(errors.starts_at || errors.ends_at) && <FieldMessage error={errors.starts_at || errors.ends_at} />}
        <TextField label="Place or link" value={place} onChange={setPlace} placeholder="Room, site or meeting link" maxLength={200} />
        {canManage && !editing && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-fg">Organizer{!hasEmployee && <span className="text-[var(--tt-danger)]"> *</span>}</p>
            <PersonPicker value={organizer} onChange={(v) => { setOrganizer(v.slice(-1)); clear('organizer_employee_id'); }} search={search} invalid={!!errors.organizer_employee_id} placeholder={hasEmployee ? 'Me, unless you pick someone' : 'Search by name or code'} />
            {errors.organizer_employee_id && <p className="mt-1 text-xs text-[var(--tt-danger)]">{errors.organizer_employee_id}</p>}
          </div>
        )}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg">People <span className="font-normal text-fg-muted">· {people.length}</span></p>
          <PersonPicker multiple value={people} onChange={(v) => { setPeople(v); clear('attendee_ids'); }} search={search} invalid={!!errors.attendee_ids} placeholder="Search people to invite" />
          {errors.attendee_ids && <p className="mt-1 text-xs text-[var(--tt-danger)]">{errors.attendee_ids}</p>}
        </div>
        <Textarea label="Agenda" rows={3} maxLength={8000} value={agenda} onChange={(e) => setAgenda(e.target.value)} hint="Optional. Shown on the minutes." error={errors.agenda} />
        {general && <p role="alert" className="text-sm text-[var(--tt-danger)]">{general}</p>}
      </div>
    </Dialog>
  );
}
