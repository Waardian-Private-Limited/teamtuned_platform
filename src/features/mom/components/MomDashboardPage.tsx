'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, FileText, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import { formatDayTime } from '@/lib/datetime';
import { showError, showSuccess } from '@/lib/toast';
import { useAuth } from '@/providers/auth-provider';
import { usePermission } from '@/lib/hooks/usePermission';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Btn, PageHead, Table, td } from '@/features/performance/components/ui';
import * as api from '../api/mom.api';
import type { Meeting, Point, PointAction } from '../api/mom.api';
import { MeetingEditor } from './MeetingEditor';
import { BUCKET_LABEL, BUCKET_ORDER, MOM_CREATE, MOM_MANAGE } from './parts';
import { PointDrawer } from './PointDrawer';
import { PointRow } from './PointRow';

type Tab = 'mine' | 'notes' | 'past' | 'team';

function Tile({ label, value, tone }: { label: string; value: number; tone?: 'bad' }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3.5">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
      <p className={cx('mt-1.5 text-2xl font-extrabold leading-none tabular-nums', tone === 'bad' ? 'text-[var(--tt-danger)]' : 'text-fg')}>{value}</p>
    </div>
  );
}

/**
 * MOM home. "Mine": what I owe, what waits for my sign-off, the meetings coming up and the latest minutes.
 * "Team" (MOM_MANAGE): open and late actions per person. The org admin account is not an employee and lands on the team view.
 */
export function MomDashboardPage({ basePath, mode }: { basePath: string; mode: 'self' | 'admin' }) {
  const router = useRouter();
  const { employee_id } = useAuth();
  const { can } = usePermission();
  const manager = can(MOM_MANAGE);
  const canCreate = manager || can(MOM_CREATE);
  const [tab, setTab] = React.useState<Tab>(mode === 'admin' ? 'team' : 'mine');
  const [creating, setCreating] = React.useState(false);
  const showTabs = mode === 'self';
  const tabs: { value: Tab; label: string }[] = [{ value: 'mine', label: 'Mine' }, { value: 'notes', label: 'Decisions & notes' }, { value: 'past', label: 'Past' }, ...(manager ? [{ value: 'team' as Tab, label: 'Team' }] : [])];

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-6">
      <PageHead
        title="Minutes of meeting"
        subtitle={tab === 'mine' ? 'Your actions, sign-offs and meetings' : tab === 'notes' ? 'Decisions and notes from your meetings, or shared with you' : tab === 'past' ? 'Actions you finished or that were cancelled' : 'Open and late actions across your people'}
        actions={
          <>
            {showTabs && <SegmentedControl<Tab> options={tabs} value={tab} onChange={setTab} fitText />}
            <Link href={`${basePath}/meetings`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-xs font-semibold text-fg shadow-xs hover:bg-bg-subtle sm:text-sm"><CalendarDays className="h-3.5 w-3.5" aria-hidden />All meetings</Link>
            {canCreate && <Btn icon={Plus} onClick={() => setCreating(true)}>New meeting</Btn>}
          </>
        }
      />
      {mode === 'self' && tab === 'mine' ? <Mine basePath={basePath} onMore={() => setTab('notes')} /> : mode === 'self' && tab === 'notes' ? <Notes basePath={basePath} /> : mode === 'self' && tab === 'past' ? <Past basePath={basePath} /> : <TeamActions />}
      {creating && (
        <MeetingEditor canManage={manager} hasEmployee={Boolean(employee_id)} onClose={() => setCreating(false)}
          onSaved={(d) => { setCreating(false); showSuccess('Meeting scheduled'); router.push(`${basePath}/meetings/${d.meeting.id}`); }} />
      )}
    </div>
  );
}

function Mine({ basePath, onMore }: { basePath: string; onMore: () => void }) {
  const { organization } = useAuth();
  const tz = organization?.timezone;
  const { data, error, refetch } = useAsync(() => api.summary(), []);
  const latest = useAsync(() => api.myNotes('', 1), []);
  const [open, setOpen] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState<number | null>(null);
  const act = async (p: Point, a: PointAction) => {
    setBusy(p.id);
    try { await api.pointAction(p.id, a); await refetch(); } catch (e) { showError(messageOf(e)); } finally { setBusy(null); }
  };

  if (error && !data) return <p className="text-sm text-[var(--tt-danger)]">{error} <button type="button" className="font-semibold underline" onClick={() => void refetch()}>Try again</button></p>;
  if (!data) {
    return <div className="space-y-3" aria-busy><div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-line bg-surface" />)}</div><div className="h-64 animate-pulse rounded-xl border border-line bg-surface" /></div>;
  }
  const { counts, today } = data;
  const undated = data.actions.filter((p) => p.due_bucket === 'none');
  const groups = [...BUCKET_ORDER.map((b) => ({ key: b, title: BUCKET_LABEL[b], list: data.actions.filter((p) => p.due_bucket === b) })), { key: 'none', title: 'No date', list: undated }].filter((g) => g.list.length);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile label="My open actions" value={counts.open} />
        <Tile label="Overdue" value={counts.overdue} tone={counts.overdue > 0 ? 'bad' : undefined} />
        <Tile label="Due this week" value={counts.week} />
        <Tile label="For my sign-off" value={counts.signoff} />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-3">
          {data.signoffs.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-[var(--tt-primary)] bg-surface">
              <h2 className="border-b border-line bg-bg-subtle px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-fg">Waiting for your sign-off · {data.signoffs.length}</h2>
              <ul className="divide-y divide-line">
                {data.signoffs.map((p) => <PointRow key={p.id} point={p} today={today} showMeeting onOpen={(x) => setOpen(x.id)} onAct={act} busy={busy === p.id} />)}
              </ul>
            </section>
          )}
          {groups.length === 0 ? (
            <section className="rounded-xl border border-line bg-surface"><EmptyState compact title="Nothing waiting on you" description="Actions from your meetings show here, soonest first." /></section>
          ) : groups.map((g) => (
            <section key={g.key} className="overflow-hidden rounded-xl border border-line bg-surface">
              <h2 className={cx('border-b border-line bg-bg-subtle px-4 py-2.5 text-xs font-bold uppercase tracking-wide', g.key === 'overdue' ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>{g.title} · {g.list.length}</h2>
              <ul className="divide-y divide-line">
                {g.list.map((p) => <PointRow key={p.id} point={p} today={today} showMeeting onOpen={(x) => setOpen(x.id)} onAct={act} busy={busy === p.id} />)}
              </ul>
            </section>
          ))}
          {latest.data && latest.data.items.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-line bg-surface">
              <h2 className="flex items-center justify-between border-b border-line bg-bg-subtle px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-fg-muted">
                <span>Latest decisions &amp; notes</span>
                {latest.data.total > 5 && <button type="button" onClick={onMore} className="font-semibold normal-case tracking-normal text-fg underline">See all {latest.data.total}</button>}
              </h2>
              <ul className="divide-y divide-line">
                {latest.data.items.slice(0, 5).map((p) => <PointRow key={p.id} point={p} today={latest.data!.today} showMeeting onOpen={(x) => setOpen(x.id)}
                  onAck={async (x) => { try { await api.acknowledgePoint(x.id); await latest.refetch(); } catch (e) { showError(messageOf(e)); } }} />)}
              </ul>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-3">
          <MeetingList title="Next 7 days" empty="No meetings coming up." items={data.upcoming} basePath={basePath} tz={tz} />
          <MeetingList title="Recent minutes" empty="No published minutes yet." items={data.recent} basePath={basePath} tz={tz} icon />
        </aside>
      </div>
      {open && <PointDrawer key={open} id={open} basePath={basePath} onClose={() => setOpen(null)} onChanged={() => void refetch()} />}
    </>
  );
}

type Feed = { today: string; total: number; page: number; pageSize: number; items: Point[] };

/** A list that loads the next page when its end scrolls into view, so nothing is skipped. `key` restarts it (a filter changed). */
function useFeed(load: (page: number) => Promise<Feed>, key: string) {
  const [items, setItems] = React.useState<Point[]>([]);
  const [today, setToday] = React.useState('');
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const page = React.useRef(0);
  const busy = React.useRef(false);
  const run = React.useRef(load);
  run.current = load;

  const more = React.useCallback(async (reset = false) => {
    if (busy.current) return;
    busy.current = true; setLoading(true);
    try {
      const next = reset ? 1 : page.current + 1;
      const r = await run.current(next);
      page.current = next;
      setToday(r.today); setTotal(r.total);
      setItems((prev) => (reset ? r.items : [...prev, ...r.items.filter((x) => !prev.some((y) => y.id === x.id))]));
      setError(null);
    } catch (e) { setError(messageOf(e)); } finally { busy.current = false; setLoading(false); }
  }, []);

  React.useEffect(() => { page.current = 0; setItems([]); void more(true); }, [key, more]);

  const end = React.useRef<HTMLDivElement | null>(null);
  const hasMore = items.length < total;
  React.useEffect(() => {
    const node = end.current;
    if (!node || !hasMore || error) return undefined;
    const io = new IntersectionObserver((e) => { if (e[0]?.isIntersecting) void more(); }, { rootMargin: '240px' });
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, error, items.length, more]);

  return { items, today, total, loading, error, hasMore, end, reload: () => more(true) };
}

function FeedList({ feed, basePath, empty, onAck }: { feed: ReturnType<typeof useFeed>; basePath: string; empty: React.ReactNode; onAck?: (p: Point) => void }) {
  const [open, setOpen] = React.useState<number | null>(null);
  if (feed.error && feed.items.length === 0) return <p className="text-sm text-[var(--tt-danger)]">{feed.error} <button type="button" className="font-semibold underline" onClick={() => void feed.reload()}>Try again</button></p>;
  if (feed.loading && feed.items.length === 0) return <div className="h-64 animate-pulse rounded-xl border border-line bg-surface" aria-busy />;
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      {feed.items.length === 0 ? empty : (
        <ul className="divide-y divide-line">
          {feed.items.map((p) => <PointRow key={p.id} point={p} today={feed.today} showMeeting onOpen={(x) => setOpen(x.id)} onAck={onAck} />)}
        </ul>
      )}
      {feed.hasMore && <div ref={feed.end} className="px-4 py-3 text-center text-xs text-fg-muted">{feed.loading ? 'Loading more…' : 'Scroll for more'}</div>}
      {feed.error && feed.items.length > 0 && <p className="px-4 py-3 text-center text-xs text-[var(--tt-danger)]">{feed.error} <button type="button" className="font-semibold underline" onClick={() => void feed.reload()}>Reload</button></p>}
      {!feed.hasMore && feed.items.length > 0 && <p className="px-4 py-2.5 text-center text-[11px] text-fg-muted">{feed.total} in total · you have reached the end</p>}
      {open && <PointDrawer key={open} id={open} basePath={basePath} onClose={() => setOpen(null)} onChanged={() => void feed.reload()} />}
    </section>
  );
}

function Past({ basePath }: { basePath: string }) {
  const feed = useFeed((page) => api.pastPoints(page), 'past');
  return <FeedList feed={feed} basePath={basePath} empty={<EmptyState compact title="No past points yet" description="Actions you finish or that get cancelled show here." />} />;
}

function Notes({ basePath }: { basePath: string }) {
  const [kind, setKind] = React.useState<'' | 'decision' | 'note'>('');
  const feed = useFeed((page) => api.myNotes(kind, page), `notes-${kind}`);
  const ack = async (p: Point) => { try { await api.acknowledgePoint(p.id); await feed.reload(); } catch (e) { showError(messageOf(e)); } };
  return (
    <div className="space-y-3">
      <SegmentedControl<'' | 'decision' | 'note'> options={[{ value: '', label: 'All' }, { value: 'decision', label: 'Decisions' }, { value: 'note', label: 'Notes' }]} value={kind} onChange={setKind} fitText />
      <FeedList feed={feed} basePath={basePath} onAck={ack} empty={<EmptyState compact title="No decisions or notes yet" description="Decisions and notes from your meetings, or shared with you, show here." />} />
    </div>
  );
}

function MeetingList({ title, empty, items, basePath, tz, icon }: { title: string; empty: string; items: Meeting[]; basePath: string; tz?: string | null; icon?: boolean }) {
  return (
    <section className="rounded-xl border border-line bg-surface">
      <h2 className="border-b border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-fg-muted">{title}</h2>
      {items.length === 0 ? <p className="px-4 py-4 text-sm text-fg-muted">{empty}</p> : (
        <ul className="divide-y divide-line">
          {items.map((m) => (
            <li key={m.id}>
              <Link href={`${basePath}/meetings/${m.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-bg-subtle/60">
                {icon && <FileText className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-fg">{m.title}</span>
                  <span className="block truncate text-xs text-fg-muted">{m.status === 'live' ? 'Live now' : formatDayTime(icon && m.published_at ? m.published_at : m.starts_at, tz)}{m.place ? ` · ${m.place}` : ''}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TeamActions() {
  const { data, error } = useAsync(() => api.team(), []);
  if (error) return <p className="text-sm text-[var(--tt-danger)]">{error}</p>;
  if (!data) return <div className="h-64 animate-pulse rounded-xl border border-line bg-surface" aria-busy />;
  const { totals } = data;
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile label="People with actions" value={totals.people} />
        <Tile label="Open actions" value={totals.open} />
        <Tile label="Overdue" value={totals.overdue} tone={totals.overdue > 0 ? 'bad' : undefined} />
        <Tile label="In review" value={totals.in_review} />
      </div>
      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        {data.items.length === 0 ? <EmptyState compact title="No open actions" description="Actions from meetings in your scope show here, with the people who own them." /> : (
          <Table minWidth={560} head={[{ label: 'Person' }, { label: 'Department', className: 'w-48' }, { label: 'Open', className: 'w-24' }, { label: 'Overdue', className: 'w-24' }, { label: 'In review', className: 'w-24' }]}>
            {data.items.map((r) => (
              <tr key={r.employee_id}>
                <td className={`${td} font-semibold`}>{r.name}</td>
                <td className={`${td} text-fg-muted`}>{r.department || '—'}</td>
                <td className={`${td} tabular-nums`}>{r.open}</td>
                <td className={`${td} tabular-nums ${r.overdue ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted'}`}>{r.overdue}</td>
                <td className={`${td} tabular-nums text-fg-muted`}>{r.in_review}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </>
  );
}
