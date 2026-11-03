'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Cake, Heart, ListChecks, MessageCircle, NotebookPen, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { formatDate, formatDayTime } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { DashCard, EmptyLine, Stat } from '@/features/self-dashboard/components/DashCard';
import * as api from '../api/orgDashboard.api';

type Data = api.OrgDashboardDto;

const VISIBILITY: Record<string, string> = {
  organization: 'whole organization',
  sub_org: 'own company',
  my_sites: 'shared sites',
  primary_site: 'same primary site',
};

/** Initials only: birthdays never show employees' photos. */
function Initials({ name }: { name: string }) {
  const text = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tt-primary)] text-xs font-bold text-[var(--tt-on-primary)]">{text}</span>;
}

function People({ rows, label }: { rows: Array<api.PersonCount>; label: string }) {
  if (!rows.length) return null;
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {rows.map((p) => (
          <li key={p.employee_id} className="flex items-center justify-between gap-3 px-3.5 py-2 text-sm">
            <span className="min-w-0 truncate font-semibold text-fg">{p.name}</span>
            <span className="shrink-0 tabular-nums text-xs text-fg-muted">
              {p.open} open{p.overdue > 0 && <span className="font-semibold text-[var(--tt-danger)]"> · {p.overdue} overdue</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BirthdaysCard({ b, loading, error, onRetry, onChanged, tz }: { b: Data['birthdays']; loading: boolean; error: string; onRetry: () => void; onChanged: () => void; tz?: string | null }) {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const off = b && !b.settings.show;
  const ask = (w: NonNullable<Data['birthdays']>['recent_wishes'][number]) => setConfirm({
    title: 'Remove this message?',
    body: (
      <div className="space-y-2 text-sm">
        <p className="text-fg-muted">{w.author.name} to {w.celebrant.name}{w.is_reply ? ' (reply)' : ''}:</p>
        <p className="whitespace-pre-wrap rounded-lg border border-line bg-bg-subtle p-2.5 text-fg">{w.message}</p>
        <p className="text-fg-muted">It disappears for everyone{w.is_reply ? '' : ', with its replies'}. This cannot be undone.</p>
      </div>
    ),
    cta: 'Remove',
    danger: true,
    run: async () => {
      try { await api.removeWish(w.id); onChanged(); } catch (e) { showError(messageOf(e)); }
    },
  });
  const subtitle = !b ? null : off ? 'Turned off in Employee settings' : [
    `Shown to ${VISIBILITY[b.settings.visibility] || b.settings.visibility}`,
    b.settings.wishes ? 'wishes on' : 'wishes off',
    b.settings.likes ? 'likes on' : 'likes off',
  ].join(' · ');
  return (
    <DashCard title="Birthdays" subtitle={subtitle} icon={Cake} href="/org-admin/birthdays" hrefLabel="Open" loading={loading && !b} error={!b ? error : ''} onRetry={onRetry}>
      {b && (off ? (
        <EmptyLine icon={Cake} title="Birthdays are turned off" hint="Turn them on in Employees > Settings > Birthdays." />
      ) : (
        <div className="flex flex-col gap-4">
          {b.today.length === 0 ? (
            <EmptyLine icon={Cake} title="No birthdays today" />
          ) : (
            <ul className="flex flex-col gap-2">
              {b.today.map((p) => (
                <li key={p.employee_id}>
                  <Link href={`/org-admin/birthdays?e=${p.employee_id}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:border-line-strong">
                    <Initials name={p.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg">🎂 {p.name}</span>
                      <span className="block truncate text-xs text-fg-muted">{[p.designation, p.site_name].filter(Boolean).join(' · ') || 'Birthday today'}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-fg-muted">
                      {b.settings.likes && <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" aria-hidden />{p.likes}</span>}
                      {b.settings.wishes && <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" aria-hidden />{p.wishes}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {b.recent_wishes.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Latest wishes</p>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {b.recent_wishes.map((w) => (
                  <li key={w.id} className="flex items-start gap-3 px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-fg-muted">
                        <span className="font-semibold text-fg">{w.author.name}</span> {w.is_reply ? 'replied on' : 'to'} <span className="font-semibold text-fg">{w.celebrant.name}</span> · {formatDayTime(w.created_at, tz)}
                      </p>
                      <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-sm text-fg">{w.message}</p>
                    </div>
                    <button type="button" onClick={() => ask(w)} aria-label="Remove message" title="Remove an inappropriate message" className="shrink-0 rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)]">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Next 7 days</p>
            {b.upcoming.length === 0 ? (
              <p className="text-sm text-fg-muted">No birthdays coming up</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {b.upcoming.map((p) => (
                  <li key={`${p.date}-${p.employee_id}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-fg">{p.name}{p.designation ? <span className="text-fg-muted"> · {p.designation}</span> : null}</span>
                    <span className="shrink-0 text-xs text-fg-muted">{formatDate(p.date, 'weekday')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </DashCard>
  );
}

function MomCard({ m, loading, error, onRetry, tz }: { m: Data['mom']; loading: boolean; error: string; onRetry: () => void; tz?: string | null }) {
  const base = '/org-admin/mom';
  return (
    <DashCard
      title="Minutes of meeting"
      subtitle={m ? (m.totals.open === 0 ? 'No open actions' : `${m.totals.open} open action${m.totals.open === 1 ? '' : 's'} across ${m.totals.people} people`) : null}
      icon={NotebookPen}
      href={base}
      loading={loading && !m}
      error={!m ? error : ''}
      onRetry={onRetry}
    >
      {m && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Open actions" value={m.totals.open} href={base} />
            <Stat label="Overdue" value={m.totals.overdue} tone={m.totals.overdue > 0 ? 'bad' : undefined} href={base} />
            <Stat label="In review" value={m.totals.in_review} href={base} />
            <Stat label="Upcoming" value={m.upcoming.total} sub="meetings" href={`${base}/meetings`} />
          </div>
          {m.upcoming.items.length === 0 ? (
            <EmptyLine icon={CalendarClock} title="No meetings scheduled" />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {m.upcoming.items.map((x) => (
                <li key={x.id}>
                  <Link href={`${base}/meetings/${x.id}`} className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-bg-subtle">
                    <CalendarClock className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg">{x.title}</span>
                      <span className="block truncate text-xs text-fg-muted">
                        {x.status === 'live' ? 'Live now' : formatDayTime(x.starts_at, tz)}{x.organizer_name ? ` · ${x.organizer_name}` : ''}{x.attendee_count ? ` · ${x.attendee_count} attending` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <People rows={m.people} label="Most open actions" />
        </div>
      )}
    </DashCard>
  );
}

function TasksCard({ t, loading, error, onRetry }: { t: Data['tasks']; loading: boolean; error: string; onRetry: () => void }) {
  const base = '/org-admin/tasks';
  const s = t?.tiles;
  return (
    <DashCard
      title="Tasks"
      subtitle={s ? (s.open === 0 ? 'Nothing open' : `${s.open} open${s.overdue ? `, ${s.overdue} overdue` : ''}`) : null}
      icon={ListChecks}
      href={`${base}/dashboard`}
      loading={loading && !t}
      error={!t ? error : ''}
      onRetry={onRetry}
    >
      {t && s && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <Stat label="Open" value={s.open} href={`${base}/list`} />
            <Stat label="Overdue" value={s.overdue} tone={s.overdue > 0 ? 'bad' : undefined} href={`${base}/list`} />
            <Stat label="Due today" value={s.due_today} href={`${base}/list`} />
            <Stat label="In review" value={s.in_review} href={`${base}/list`} />
            <Stat label="Done this week" value={s.done_week} tone={s.done_week > 0 ? 'good' : undefined} />
            <Stat label="On time" value={s.on_time_rate === null ? '—' : `${s.on_time_rate}%`} sub="last 30 days" />
          </div>
          <People rows={t.people.filter((p) => p.open > 0)} label="Most open tasks" />
        </div>
      )}
    </DashCard>
  );
}

/**
 * The organization admin's home: birthdays (as the employee settings show them, with the latest wishes to moderate),
 * meeting actions and upcoming meetings, and tasks. A card shows only when its feature is on for the organization.
 */
export function OrgDashboardPage() {
  const { organization } = useAuth();
  const tz = organization?.timezone;
  const { data, loading, error, refetch } = useAsync(() => api.getOrgDashboard(), []);
  const reload = () => { void refetch(); };
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
      <header>
        <h1 className="text-lg font-bold text-fg sm:text-xl">Dashboard</h1>
        {data && <p className="text-sm text-fg-muted">{formatDate(data.today, 'long')}</p>}
      </header>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <BirthdaysCard b={data?.birthdays ?? null} loading={loading} error={error} onRetry={reload} onChanged={reload} tz={tz} />
        {(!data || data.features.mom) && <MomCard m={data?.mom ?? null} loading={loading} error={error || (data && !data.mom ? 'Could not load meetings' : '')} onRetry={reload} tz={tz} />}
        {(!data || data.features.tasks) && <TasksCard t={data?.tasks ?? null} loading={loading} error={error || (data && !data.tasks ? 'Could not load tasks' : '')} onRetry={reload} />}
      </div>
    </div>
  );
}
