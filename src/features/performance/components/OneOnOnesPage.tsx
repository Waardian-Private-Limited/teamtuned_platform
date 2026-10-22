'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { formatDayTime, orgToday, useOrgTimezone } from '@/lib/datetime';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { orgWallToUtcIso } from '@/features/recruitment/interviews/lib/orgTime';
import * as api from '../api/perf.api';
import type { MeetingStatus, OneOnOneList, OneOnOneRow, PersonOption } from '../types/perf.types';
import { PersonPicker } from './PersonPicker';
import { Btn, btnClass, PageHead, Panel, Table, td } from './ui';

type When = 'upcoming' | 'past';
type Role = 'all' | 'manager' | 'employee';
export const MEETING_LABEL: Record<MeetingStatus, string> = { scheduled: 'Scheduled', done: 'Done', cancelled: 'Cancelled' };
export const meetingTone = (s: MeetingStatus) => (s === 'scheduled' ? 'active' : s === 'done' ? 'neutral' : 'terminated');

/** One-on-ones the viewer takes part in, as a manager or as an employee. */
export function OneOnOnesPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [when, setWhen] = React.useState<When>('upcoming');
  const [role, setRole] = React.useState<Role>('all');
  const [data, setData] = React.useState<OneOnOneList | null>(null);
  const [error, setError] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    setData(null); setError('');
    api.oneOnOnes({ when, ...(role === 'all' ? {} : { role }) }).then(setData).catch((e) => setError(messageOf(e)));
  }, [when, role]);
  const href = (m: OneOnOneRow) => `${basePath}/one-on-ones/${m.id}`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title="One-on-ones" count={data?.items.length} subtitle="Talks with your manager or team" help={HELP.oneOnOnes}
        actions={<>
          <SegmentedControl<Role> options={[{ value: 'all', label: 'All' }, { value: 'manager', label: 'With my team' }, { value: 'employee', label: 'With my manager' }]} value={role} onChange={setRole} fitText />
          <SegmentedControl<When> options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} value={when} onChange={setWhen} fitText />
          <Btn icon={Plus} onClick={() => setCreating(true)}>New one-on-one</Btn>
        </>} />
      <Panel>
        {error && <p role="alert" className="border-b border-line p-3 text-sm text-[var(--tt-danger)]">{error}</p>}
        {!data && !error && <TableSkeleton rows={4} columns={5} />}
        {data?.items.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center p-4">
            <EmptyState illustration={{ src: '/vectors/daysummary.svg', width: 220, height: 160, alt: '' }}
              title={when === 'upcoming' ? 'Nothing booked' : 'No past one-on-ones'}
              description="A short talk every week or two keeps goals on track and problems small. Book one with your manager or someone on your team."
              action={when === 'upcoming' ? { label: 'New one-on-one', onClick: () => setCreating(true) } : undefined} />
          </div>
        )}
        {data && data.items.length > 0 && (
          <>
            <div className="hidden min-h-0 flex-1 md:block">
              <Table minWidth={680} head={[{ label: 'With' }, { label: 'When', className: 'w-56' }, { label: 'You are', className: 'w-32' }, { label: 'Open actions', className: 'w-32' }, { label: 'Status', className: 'w-32' }, { label: 'Actions', className: 'w-24 text-right' }]}>
                {data.items.map((m) => (
                  <tr key={m.id} onClick={() => router.push(href(m))} className="cursor-pointer transition-colors hover:bg-bg-subtle/50">
                    <td className={td}><span className="font-semibold">{m.with.name}</span></td>
                    <td className={`${td} text-fg-muted`}>{formatDayTime(m.scheduled_at)}</td>
                    <td className={`${td} text-fg-muted`}>{m.i_am === 'manager' ? 'Manager' : 'Employee'}</td>
                    <td className={td}>{m.open_actions || '—'}</td>
                    <td className={td}><StatusPill label={MEETING_LABEL[m.status]} tone={meetingTone(m.status)} /></td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}><Link href={href(m)} className={btnClass('secondary', 'sm')}>Open</Link></td>
                  </tr>
                ))}
              </Table>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden md:hidden">
              {data.items.map((m) => (
                <Link key={m.id} href={href(m)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-subtle/50">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-fg">{m.with.name}</p><p className="text-[11px] text-fg-muted">{formatDayTime(m.scheduled_at)}{m.open_actions ? ` · ${m.open_actions} open` : ''}</p></div>
                  <StatusPill label={MEETING_LABEL[m.status]} tone={meetingTone(m.status)} />
                </Link>
              ))}
            </div>
          </>
        )}
      </Panel>
      {creating && <ScheduleDialog myManager={data?.my_manager ?? null} onClose={() => setCreating(false)} onDone={(id) => router.push(`${basePath}/one-on-ones/${id}`)} />}
    </div>
  );
}

/** Books a one-on-one: with your own manager, or with someone on your team. Times are in the company's time zone. */
export function ScheduleDialog({ myManager, onClose, onDone, title = 'New one-on-one', submit }: {
  myManager: { id: number; name: string } | null; onClose: () => void; onDone: (id: number) => void; title?: string;
  /** For "book the next one": only the time is asked. */
  submit?: (iso: string) => Promise<{ id: number }>;
}) {
  const tz = useOrgTimezone();
  const [target, setTarget] = React.useState<'manager' | 'team'>(myManager ? 'manager' : 'team');
  const [person, setPerson] = React.useState<PersonOption | null>(null);
  const [date, setDate] = React.useState(orgToday(tz));
  const [time, setTime] = React.useState('10:00');
  const [agenda, setAgenda] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const go = async () => {
    const iso = orgWallToUtcIso(date, time, tz);
    const e: Record<string, string> = {};
    if (!iso) e.date = 'Choose a date and time';
    if (!submit && target === 'team' && !person) e.person = 'Choose who to meet';
    setErrors(e);
    if (Object.keys(e).length || !iso) return;
    setBusy(true);
    try {
      const made = submit ? await submit(iso) : await api.scheduleOneOnOne({ ...(target === 'team' ? { employee_id: person!.id } : {}), scheduled_at: iso, agenda: agenda.split('\n').map((x) => x.trim()).filter(Boolean) });
      onDone(made.id);
    } catch (err) { setErrors({ form: messageOf(err) }); } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} title={title} footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={go}>Book</Btn></>}>
      <div className="space-y-3">
        {!submit && myManager && <SegmentedControl<'manager' | 'team'> options={[{ value: 'manager', label: `My manager (${myManager.name})` }, { value: 'team', label: 'Someone on my team' }]} value={target} onChange={setTarget} fitText />}
        {!submit && target === 'team' && <PersonPicker label="Who" value={person} onChange={setPerson} search={api.oneOnOnePeople} listOnFocus placeholder="Your direct reports" error={errors.person} />}
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Date" type="date" value={date} onChange={setDate} error={errors.date} />
          <TextField label="Time" type="time" value={time} onChange={setTime} hint={tz} />
        </div>
        {!submit && <Textarea label="Agenda (optional, one point per line)" rows={3} value={agenda} onChange={(e) => setAgenda(e.target.value)} />}
        {errors.form && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.form}</p>}
      </div>
    </Dialog>
  );
}
