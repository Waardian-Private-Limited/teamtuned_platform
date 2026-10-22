'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CalendarPlus, Download, Pencil, Play, RotateCcw, Send } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { addDays, formatDayTime, formatTime, orgWallToIso } from '@/lib/datetime';
import { showError, showSuccess } from '@/lib/toast';
import { useAuth } from '@/providers/auth-provider';
import { usePermission } from '@/lib/hooks/usePermission';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill } from '@/components/ui/StatusPill';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Btn, PageHead } from '@/features/performance/components/ui';
import { Face } from '@/features/teams/components/parts';
import * as api from '../api/mom.api';
import type { Point, PointAction } from '../api/mom.api';
import { MeetingEditor } from './MeetingEditor';
import { KindInfo, MEETING_STATUS, MOM_MANAGE } from './parts';
import { PointDrawer } from './PointDrawer';
import { groupActions, PointGroup, PointRow } from './PointRow';
import { QuickAdd } from './QuickAdd';

const SECTIONS: { kind: Point['kind']; title: string }[] = [{ kind: 'decision', title: 'Decisions' }, { kind: 'action', title: 'Actions' }, { kind: 'note', title: 'Notes' }];

/** One meeting: its points to add and work through, who is on it, and the buttons that move it from planned to published. */
export function MeetingPage({ id, basePath }: { id: number; basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { organization, employee_id: myEmployeeId } = useAuth();
  const tz = organization?.timezone;
  const { can } = usePermission();
  const { track } = useDownloadCenter();
  const { data, error, refetch } = useAsync(() => api.meeting(id), [id]);
  const [busyPoint, setBusyPoint] = React.useState<number | null>(null);
  const [working, setWorking] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [follow, setFollow] = React.useState(false);
  const [showDeleted, setShowDeleted] = React.useState(false);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const open = Number(params.get('point')) || null;
  const setOpen = (pointId: number | null) => router.replace(pointId ? `?point=${pointId}` : '?', { scroll: false });

  const back = <Link href={`${basePath}/meetings`} aria-label="Back to meetings" className="rounded-[var(--tt-radius-sm)] p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>;
  if (error && !data) return <div className="flex flex-col gap-3"><PageHead title={<>{back}Meeting</>} /><p className="text-sm text-[var(--tt-danger)]">{error}</p></div>;
  if (!data) return <div className="space-y-3" aria-busy><div className="h-20 animate-pulse rounded-xl border border-line bg-surface" /><div className="h-40 animate-pulse rounded-xl border border-line bg-surface" /><div className="h-64 animate-pulse rounded-xl border border-line bg-surface" /></div>;

  const { meeting: m, attendees, points, carried, deleted, access, today } = data;
  const status = MEETING_STATUS[m.status];
  const hasEmployee = Boolean(myEmployeeId);

  const step = async (action: 'start' | 'publish' | 'reopen' | 'cancel', done: string) => {
    setWorking(true);
    try { await api.meetingAction(m.id, action); await refetch(); showSuccess(done); } catch (e) { showError(messageOf(e)); } finally { setWorking(false); }
  };
  const act = async (p: Point, a: PointAction) => {
    setBusyPoint(p.id);
    try { await api.pointAction(p.id, a); await refetch(); } catch (e) { showError(messageOf(e)); } finally { setBusyPoint(null); }
  };
  const toTask = async (p: Point) => {
    setBusyPoint(p.id);
    try { await api.makeTask(p.id); await refetch(); showSuccess('Converted to task'); } catch (e) { showError(messageOf(e)); } finally { setBusyPoint(null); }
  };
  const acknowledge = async (p: Point) => {
    setBusyPoint(p.id);
    try { await api.acknowledgePoint(p.id); await refetch(); showSuccess('Acknowledged'); } catch (e) { showError(messageOf(e)); } finally { setBusyPoint(null); }
  };
  const download = async () => {
    try { track(await api.exportMinutes(m.id)); showSuccess('The minutes are being prepared. Find them in Downloads.'); } catch (e) { showError(messageOf(e)); }
  };
  const when = `${formatDayTime(m.starts_at, tz)}${m.ends_at ? ` to ${formatTime(m.ends_at, tz)}` : ''}`;

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-6">
      <PageHead
        title={<>{back}{m.title}<StatusPill label={status.label} tone={status.tone} /></>}
        subtitle={[when, m.place, m.organizer_name && `Organized by ${m.organizer_name}`].filter(Boolean).join(' · ')}
        actions={
          <>
            <Btn variant="secondary" icon={Download} onClick={download}>Minutes PDF</Btn>
            {access.can_edit && (m.status === 'scheduled' || m.status === 'live') && <Btn variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Btn>}
            {access.actions.includes('follow_up') && <Btn variant="secondary" icon={CalendarPlus} onClick={() => setFollow(true)}>Follow-up</Btn>}
            {access.actions.includes('reopen') && <Btn variant="secondary" icon={RotateCcw} loading={working} onClick={() => step('reopen', 'Reopened. Publish the minutes again when you are done.')}>Reopen</Btn>}
            {access.actions.includes('cancel') && <Btn variant="ghost" disabled={working} onClick={() => setConfirm({ title: 'Cancel this meeting?', body: 'Everyone invited is told. The points stay on record.', cta: 'Cancel meeting', danger: true, run: () => step('cancel', 'Meeting cancelled') })}>Cancel meeting</Btn>}
            {access.actions.includes('start') && <Btn variant="secondary" icon={Play} loading={working} onClick={() => step('start', 'Meeting started')}>Start</Btn>}
            {access.actions.includes('publish') && <Btn icon={Send} loading={working} onClick={() => setConfirm({ title: 'Publish the minutes?', body: 'Everyone on the meeting gets one message with the decisions and the actions they own.', cta: 'Publish', run: () => step('publish', 'Minutes published') })}>Publish minutes</Btn>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-3">
          {m.agenda && (
            <section className="rounded-xl border border-line bg-surface p-4">
              <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-fg-muted">Agenda</h2>
              <p className="whitespace-pre-wrap text-sm text-fg">{m.agenda}</p>
            </section>
          )}

          {access.can_add_points && <QuickAdd meetingId={m.id} today={today} tasks={access.tasks} onAdded={() => void refetch()} />}

          {points.length === 0 && (
            <section className="rounded-xl border border-line bg-surface">
              <EmptyState compact title="No points yet" description={access.can_add_points ? 'Type above and press Enter to add the first one.' : 'Nothing has been added to this meeting.'} />
            </section>
          )}
          {SECTIONS.map(({ kind, title }) => {
            const list = points.filter((p) => p.kind === kind);
            if (!list.length) return null;
            return (
              <section key={kind} className="overflow-hidden rounded-xl border border-line bg-surface">
                <h2 className="flex items-center gap-1.5 border-b border-line bg-bg-subtle px-4 py-2 text-xs font-bold uppercase tracking-wide text-fg-muted">{title} · {list.length}<KindInfo kind={kind} /></h2>
                <ul className="divide-y divide-line">
                  {groupActions(list).map((g) => (g.kind === 'one'
                    ? <PointRow key={g.point.id} point={g.point} today={today} onOpen={(x) => setOpen(x.id)} onAct={act} onAck={acknowledge} onTask={toTask} busy={busyPoint === g.point.id} />
                    : <PointGroup key={`g${g.points[0].group_id}`} points={g.points} today={today} onOpen={(x) => setOpen(x.id)} onAct={act} busyId={busyPoint} />))}
                </ul>
              </section>
            );
          })}

          {deleted.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-dashed border-line bg-surface">
              <button type="button" onClick={() => setShowDeleted(!showDeleted)} aria-expanded={showDeleted} className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-fg-muted hover:text-fg">
                <span>Deleted · {deleted.length}</span>
                <span className="text-[11px] font-semibold normal-case">{showDeleted ? 'Hide' : 'Only you and managers can see these'}</span>
              </button>
              {showDeleted && (
                <ul className="divide-y divide-line border-t border-line">
                  {deleted.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <button type="button" onClick={() => setOpen(p.id)} className="min-w-0 flex-1 text-left">
                        <span className="block text-sm text-fg-muted line-through">{p.text}</span>
                        <span className="block text-[11px] text-fg-muted">Deleted{p.deleted_by_name ? ` by ${p.deleted_by_name}` : ''}{p.deleted_at ? ` · ${formatDayTime(p.deleted_at, tz)}` : ''}{p.delete_reason ? ` · ${p.delete_reason}` : ''}</span>
                      </button>
                      {p.can_restore && <Btn size="sm" variant="secondary" onClick={async () => { try { await api.restorePoint(p.id); await refetch(); showSuccess('Restored'); } catch (e) { showError(messageOf(e)); } }}>Restore</Btn>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {carried.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-line bg-surface">
              <h2 className="border-b border-line bg-bg-subtle px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-fg-muted">Open from last time · {carried.length}</h2>
              <ul className="divide-y divide-line">
                {carried.map((p) => <PointRow key={p.id} point={p} today={today} showMeeting onOpen={(x) => setOpen(x.id)} onAct={act} busy={busyPoint === p.id} />)}
              </ul>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-3">
          <section className="rounded-xl border border-line bg-surface">
            <h2 className="border-b border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-fg-muted">People · {attendees.length}</h2>
            <ul className="divide-y divide-line">
              {attendees.map((a) => (
                <li key={a.employee_id} className="flex items-center gap-3 px-4 py-2.5">
                  <Face name={a.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{a.name}</p>
                    <p className="truncate text-xs text-fg-muted">{a.role === 'organizer' ? 'Organizer' : a.department || 'Attendee'}</p>
                  </div>
                  {access.can_edit && m.status !== 'cancelled' ? (
                    <label className="flex shrink-0 items-center gap-1.5 text-xs text-fg-muted">
                      <input type="checkbox" checked={a.attended} onChange={async (e) => { try { await api.markAttended(m.id, a.employee_id, e.target.checked); await refetch(); } catch (err) { showError(messageOf(err)); } }} />
                      Present
                    </label>
                  ) : a.attended ? <span className="text-xs font-semibold text-fg-muted">Present</span> : null}
                </li>
              ))}
            </ul>
          </section>
          {m.previous_meeting_id && (
            <Link href={`${basePath}/meetings/${m.previous_meeting_id}`} className="block rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-fg hover:border-line-strong">Previous meeting of this series</Link>
          )}
          {m.published_at && <p className="px-1 text-xs text-fg-muted">Minutes published {formatDayTime(m.published_at, tz)}</p>}
        </aside>
      </div>

      {editing && <MeetingEditor detail={data} canManage={can(MOM_MANAGE)} hasEmployee={hasEmployee} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void refetch(); showSuccess('Meeting saved'); }} />}
      {follow && <FollowUpDialog title={m.title} today={today} onClose={() => setFollow(false)} onCreate={async (startsAt) => {
        try { const d = await api.followUp(m.id, { starts_at: startsAt }); setFollow(false); router.push(`${basePath}/meetings/${d.meeting.id}`); } catch (e) { showError(messageOf(e)); }
      }} />}
      {open && <PointDrawer key={open} id={open} basePath={basePath} onClose={() => setOpen(null)} onChanged={() => void refetch()} />}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function FollowUpDialog({ title, today, onClose, onCreate }: { title: string; today: string; onClose: () => void; onCreate: (startsAtIso: string) => Promise<void> }) {
  const { organization } = useAuth();
  const [date, setDate] = React.useState(addDays(today, 7));
  const [time, setTime] = React.useState('10:00');
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog open onClose={onClose} title="Schedule the next meeting" maxWidthClassName="max-w-md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={async () => { const iso = orgWallToIso(date, time, organization?.timezone); if (!iso) return; setBusy(true); await onCreate(iso); setBusy(false); }}>Create</Btn></>}>
      <div className="space-y-3">
        <p className="text-sm text-fg-muted">Same people and place as “{title}”. Its open actions show up in the new meeting.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-fg">Date</span><input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-fg">Starts</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg" /></label>
        </div>
      </div>
    </Dialog>
  );
}
