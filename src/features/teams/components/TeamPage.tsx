'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarOff, Crown, Pencil, RotateCw } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { formatDate, formatTime } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import { useAuth } from '@/providers/auth-provider';
import { usePermission } from '@/lib/hooks/usePermission';
import { EmptyState } from '@/components/ui/EmptyState';
import { minutesText } from '@/features/detailed-attendance/utils/format';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Btn, IconBtn, PageHead, SearchBox } from '@/features/performance/components/ui';
import * as api from '../api/teams.api';
import type { TeamMember, TeamToday } from '../api/teams.api';
import { BUCKETS, bucketOf, CountsBar, Face, StatusTag, TEAMS_MANAGE, type Bucket } from './parts';
import { TeamEditor } from './TeamEditor';

// Back on the tab after a while: people have come in since, so read the team again (at most this often).
const STALE_MS = 2 * 60 * 1000;
const SEARCH_FROM = 12;

/** One team today: the shape of the day, everyone's status (times for leads and HR), and who is away this week. */
export function TeamPage({ teamKey, basePath }: { teamKey: string; basePath: string }) {
  const { data, loading, error, refetch } = useAsync(() => api.today(teamKey), [teamKey]);
  const { can } = usePermission();
  const [filter, setFilter] = React.useState<Bucket | 'all'>('all');
  const [q, setQ] = React.useState('');
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < STALE_MS) return;
      last = Date.now();
      void refetch();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refetch]);

  const back = <Link href={`${basePath}/teams`} aria-label="Back to teams" className="rounded-[var(--tt-radius-sm)] p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>;

  if (error && !data) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <PageHead title={<>{back}Team</>} />
        <p className="text-sm text-[var(--tt-danger)]">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3" aria-busy>
        <div className="h-20 animate-pulse rounded-xl border border-line bg-surface" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-line bg-surface" />)}</div>
        <div className="h-64 animate-pulse rounded-xl border border-line bg-surface" />
      </div>
    );
  }

  const { team, counts, access } = data;
  const needle = q.trim().toLowerCase();
  const shown = data.members.filter((m) => (filter === 'all' || bucketOf(m.status) === filter) && (!needle || `${m.name} ${m.employee_code || ''} ${m.role || ''} ${m.department || ''}`.toLowerCase().includes(needle)));
  const leads = team.leads.map((l) => l.name).join(', ');

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-4">
      <PageHead
        title={<>{back}{team.name}</>}
        count={counts.total}
        subtitle={[team.kind === 'reports' ? 'Reporting team' : team.description, leads && `Led by ${leads}`].filter(Boolean).join(' · ')}
        actions={
          <>
            <span className="text-xs text-fg-muted">{formatDate(data.date, 'weekday')}</span>
            <IconBtn label="Refresh" onClick={() => void refetch()}><RotateCw className={cx('h-4 w-4', loading && 'animate-spin')} /></IconBtn>
            {access.can_edit && <Btn variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit team</Btn>}
          </>
        }
      >
        <CountsBar counts={counts} />
      </PageHead>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6" role="tablist" aria-label="Filter people">
        <FilterTile label="Everyone" value={counts.total} active={filter === 'all'} onClick={() => setFilter('all')} />
        {BUCKETS.map((b) => <FilterTile key={b.key} label={b.label} value={counts[b.key]} tone={b.key === 'absent' && counts.absent > 0 ? 'bad' : undefined} active={filter === b.key} onClick={() => setFilter(filter === b.key ? 'all' : b.key)} />)}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 rounded-xl border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
            <p className="text-xs font-semibold text-fg sm:text-[13px]">{filter === 'all' ? 'Everyone' : BUCKETS.find((b) => b.key === filter)?.label}<span className="font-normal text-fg-muted"> · {shown.length}</span></p>
            {data.members.length >= SEARCH_FROM && <SearchBox value={q} onChange={setQ} placeholder="Search people" />}
          </div>
          {shown.length === 0 ? (
            <EmptyState compact title={needle ? 'No one matches' : 'No one here right now'} description={needle ? 'Try another name.' : 'Pick another filter above.'} />
          ) : (
            <ul className="grid grid-cols-1 gap-2.5 p-3 md:grid-cols-2 2xl:grid-cols-3">
              {shown.map((m) => <MemberCard key={m.employee_id} m={m} detailed={access.detailed} />)}
            </ul>
          )}
        </section>
        <OutAhead data={data} />
      </div>

      {editing && team.kind === 'built' && (
        <TeamEditor id={Number(team.key)} canManage={can(TEAMS_MANAGE)} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); showSuccess('Team saved'); void refetch(); }} />
      )}
    </div>
  );
}

function FilterTile({ label, value, active, tone, onClick }: { label: string; value: number; active: boolean; tone?: 'bad'; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick}
      className={cx('rounded-xl border p-3 text-left transition-colors', active ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg hover:border-line-strong')}>
      <p className={cx('truncate text-[11px] font-semibold uppercase tracking-wide', active ? 'opacity-80' : 'text-fg-muted')}>{label}</p>
      <p className={cx('mt-1 text-2xl font-extrabold leading-none tabular-nums', !active && tone === 'bad' && 'text-[var(--tt-danger)]')}>{value}</p>
    </button>
  );
}

function MemberCard({ m, detailed }: { m: TeamMember; detailed: boolean }) {
  const { organization } = useAuth();
  const tz = organization?.timezone;
  const sub = [m.role, m.department].filter(Boolean).join(' · ');
  const showTimes = detailed && (m.first_in_at || m.last_out_at);
  return (
    <li className={cx('flex flex-col gap-3 rounded-xl border p-3', m.is_me ? 'border-line-strong' : 'border-line')}>
      <div className="flex items-start gap-3">
        <Face name={m.name} photo={m.photo_url} status={m.status} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold text-fg">
            <span className="truncate">{m.name}</span>
            {m.is_lead && <Crown className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-label="Lead" />}
            {m.is_me && <span className="shrink-0 rounded-full bg-bg-subtle px-1.5 text-[10px] font-bold text-fg-muted">You</span>}
          </p>
          {sub && <p className="truncate text-xs text-fg-muted">{sub}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusTag status={m.status} />
            {detailed && m.late && (
              <span className="rounded-full border border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--tt-danger)]">Late{m.late_minutes ? ` ${minutesText(m.late_minutes)}` : ''}</span>
            )}
          </div>
        </div>
      </div>
      {showTimes && (
        <dl className="grid grid-cols-3 gap-1.5 rounded-lg bg-bg-subtle px-2.5 py-2 text-center">
          <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">In</dt><dd className="text-xs font-bold tabular-nums text-fg">{m.first_in_at ? formatTime(m.first_in_at, tz) : '—'}</dd></div>
          <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Out</dt><dd className="text-xs font-bold tabular-nums text-fg">{m.last_out_at && m.status !== 'working' ? formatTime(m.last_out_at, tz) : '—'}</dd></div>
          <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Worked</dt><dd className="text-xs font-bold tabular-nums text-fg">{m.worked_minutes ? minutesText(m.worked_minutes) : '—'}</dd></div>
        </dl>
      )}
    </li>
  );
}

const PART: Record<string, string> = { first_half: 'first half', second_half: 'second half', hours: 'a few hours' };

/** Who is away in the next week. Teammates see only that someone is away; leads and HR also see the leave type. */
function OutAhead({ data }: { data: TeamToday }) {
  const faces = new Map(data.members.map((m) => [m.employee_id, m]));
  return (
    <aside className="h-fit rounded-xl border border-line bg-surface">
      <div className="border-b border-line p-3">
        <p className="text-xs font-semibold text-fg sm:text-[13px]">Away next 7 days<span className="font-normal text-fg-muted"> · {data.out_ahead.length}</span></p>
      </div>
      {data.out_ahead.length === 0 ? (
        <div className="flex items-center gap-3 p-4">
          <CalendarOff className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
          <p className="text-sm text-fg-muted">No approved leave this week.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {data.out_ahead.map((p) => {
            const first = p.days[0];
            const last = p.days[p.days.length - 1];
            const half = p.days.length === 1 && PART[first.part];
            return (
              <li key={p.employee_id} className="flex items-center gap-3 px-3 py-2.5">
                <Face name={p.name} photo={faces.get(p.employee_id)?.photo_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{p.name}</p>
                  <p className="truncate text-xs text-fg-muted">
                    {formatDate(first.date, 'short')}{p.days.length > 1 ? ` – ${formatDate(last.date, 'short')} · ${p.days.length} days` : half ? ` · ${half}` : ''}
                    {p.leave_type ? ` · ${p.leave_type}` : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
