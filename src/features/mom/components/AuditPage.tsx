'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Search, Trash2, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { formatDate, formatDayTime } from '@/lib/datetime';
import { useAuth } from '@/providers/auth-provider';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/FormControls';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Btn, PageHead, Panel, SearchBox, Table, td } from '@/features/performance/components/ui';
import * as api from '../api/mom.api';
import type { AuditEvent, AuditFilters, AuditPerson, Point, PointStatus } from '../api/mom.api';
import { assignLabel } from './AssignPicker';
import { dueText, POINT_STATUS, StatusTag } from './parts';
import { PointDrawer } from './PointDrawer';

type Tab = 'people' | 'points' | 'activity';
const PAGE = 25;
const PEOPLE_PAGE = 20;

const EVENT_LABEL: Record<string, string> = {
  created: 'added', started: 'started', submitted: 'handed over for sign-off', confirmed: 'confirmed', done: 'marked done', sent_back: 'sent back', cancelled: 'cancelled',
  reopened: 'reopened', reassigned: 'changed the owner of', due_changed: 'changed the due date of', task: 'made a task of', edited: 'edited', deleted: 'deleted', restored: 'restored',
};
const KIND_OPTIONS = ['created', 'edited', 'deleted', 'restored', 'reassigned', 'due_changed', 'submitted', 'confirmed', 'sent_back', 'done', 'cancelled'];
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a * 100) / b)}%` : '—');

function Tile({ label, value, sub, active, tone, onClick }: { label: string; value: number | string; sub?: string; active?: boolean; tone?: 'bad'; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} aria-pressed={active}
      className={cx('rounded-xl border p-3.5 text-left transition-colors disabled:cursor-default', active ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-surface hover:border-line-strong')}>
      <p className={cx('truncate text-[11px] font-semibold uppercase tracking-wide', active ? 'opacity-80' : 'text-fg-muted')}>{label}</p>
      <p className={cx('mt-1.5 text-2xl font-extrabold leading-none tabular-nums', !active && tone === 'bad' && Number(value) > 0 && 'text-[var(--tt-danger)]')}>{value}</p>
      {sub && <p className={cx('mt-1.5 truncate text-xs', active ? 'opacity-80' : 'text-fg-muted')}>{sub}</p>}
    </button>
  );
}

/**
 * The review dashboard for people who manage MOM: totals and one row per person, every point with its edits and deletions,
 * and a feed of what happened. Read-only; a point opens in the same drawer with its versions and history.
 */
export function AuditPage({ basePath }: { basePath: string }) {
  const { organization } = useAuth();
  const tz = organization?.timezone;
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>('people');
  const [department, setDepartment] = React.useState<number | undefined>();
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [person, setPerson] = React.useState<{ id: number; name: string } | null>(null);
  const [status, setStatus] = React.useState<PointStatus | ''>('');
  const [overdue, setOverdue] = React.useState(false);
  const [edited, setEdited] = React.useState(false);
  const [deleted, setDeleted] = React.useState<'' | 'include' | 'only'>('');
  const [q, setQ] = React.useState('');
  const [needle, setNeedle] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState<number | null>(null);
  const [kind, setKind] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [find, setFind] = React.useState('');
  const [peoplePage, setPeoplePage] = React.useState(1);

  React.useEffect(() => { const t = setTimeout(() => { setNeedle(q.trim()); setPage(1); }, 250); return () => clearTimeout(t); }, [q]);
  React.useEffect(() => { const t = setTimeout(() => { setFind(search.trim()); setPeoplePage(1); }, 250); return () => clearTimeout(t); }, [search]);
  const options = useAsync(() => api.assignOptions(), []);
  const base: AuditFilters = { department_id: department, from: from || undefined, to: to || undefined };
  const overview = useAsync(() => api.auditOverview({ ...base, employee_id: person?.id, search: find || undefined, page: peoplePage, pageSize: PEOPLE_PAGE }), [department, from, to, person?.id, find, peoplePage]);
  const pointFilters: AuditFilters = { ...base, employee_id: person?.id, status: status || undefined, overdue, edited, deleted: deleted || undefined, q: needle || undefined, page, pageSize: PAGE };
  const points = useAsync(() => api.auditPoints(pointFilters), [department, from, to, person?.id, status, overdue, edited, deleted, needle, page], tab === 'points');

  const t = overview.data?.tiles;
  const reset = () => { setStatus(''); setOverdue(false); setEdited(false); setDeleted(''); setQ(''); setPerson(null); setPage(1); setPeoplePage(1); };
  const pickPerson = (p: { id: number; name: string } | null) => { setPerson(p); setPage(1); setPeoplePage(1); };
  const jump = (patch: () => void) => { reset(); patch(); setTab('points'); };
  const filtered = Boolean(person || status || overdue || edited || deleted || needle);

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-6">
      <PageHead
        title="MOM audit"
        subtitle="Every point, who it is with, and what was changed or deleted"
        actions={
          <>
            <select aria-label="Department" value={department ?? ''} onChange={(e) => { setDepartment(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
              className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm">
              <option value="">All departments</option>
              {options.data?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input type="date" aria-label="Meetings from" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-line bg-surface px-2 text-xs text-fg sm:text-sm" />
            <input type="date" aria-label="Meetings to" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-line bg-surface px-2 text-xs text-fg sm:text-sm" />
            {(department || from || to) && <Btn variant="ghost" size="sm" onClick={() => { setDepartment(undefined); setFrom(''); setTo(''); }}>Clear</Btn>}
          </>
        }
      />

      <EmployeeFind person={person} onPick={pickPerson} />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
        <Tile label="Actions" value={t?.actions ?? '—'} onClick={() => jump(() => undefined)} />
        <Tile label="Open" value={t?.open ?? '—'} />
        <Tile label="Overdue" value={t?.overdue ?? '—'} tone="bad" active={tab === 'points' && overdue} onClick={() => jump(() => setOverdue(true))} />
        <Tile label="In review" value={t?.in_review ?? '—'} active={tab === 'points' && status === 'review'} onClick={() => jump(() => setStatus('review'))} />
        <Tile label="Done" value={t?.done ?? '—'} sub={t ? `${pct(t.on_time, t.done_with_due)} on time` : undefined} active={tab === 'points' && status === 'done'} onClick={() => jump(() => setStatus('done'))} />
        <Tile label="Edited" value={t?.edited ?? '—'} active={tab === 'points' && edited} onClick={() => jump(() => setEdited(true))} />
        <Tile label="Deleted" value={t?.deleted ?? '—'} active={tab === 'points' && deleted === 'only'} onClick={() => jump(() => setDeleted('only'))} />
      </div>

      <SegmentedControl<Tab> options={[{ value: 'people', label: 'People' }, { value: 'points', label: 'Points' }, { value: 'activity', label: 'Activity' }]} value={tab} onChange={setTab} fitText />

      {tab === 'people' && (
        <People rows={overview.data?.people} total={overview.data?.people_total ?? 0} page={peoplePage} onPage={setPeoplePage} search={search} onSearch={setSearch} searching={Boolean(find)}
          loading={overview.loading && !overview.data} error={overview.error} onPick={(p) => jump(() => setPerson({ id: p.employee_id, name: p.name }))} />
      )}

      {tab === 'points' && (
        <Panel>
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <SearchBox value={q} onChange={setQ} placeholder="Search points or meetings" />
            <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as PointStatus | ''); setPage(1); }} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm">
              <option value="">Any status</option>
              {(Object.keys(POINT_STATUS) as PointStatus[]).map((s) => <option key={s} value={s}>{POINT_STATUS[s].label}</option>)}
            </select>
            <Chip active={overdue} onClick={() => { setOverdue(!overdue); setPage(1); }}>Overdue</Chip>
            <Chip active={edited} onClick={() => { setEdited(!edited); setPage(1); }}>Edited</Chip>
            <select aria-label="Deleted points" value={deleted} onChange={(e) => { setDeleted(e.target.value as '' | 'include' | 'only'); setPage(1); }} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm">
              <option value="">Hide deleted</option>
              <option value="include">Include deleted</option>
              <option value="only">Only deleted</option>
            </select>
            {person && <span className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-1 pl-3 pr-1.5 text-xs font-semibold text-fg">{person.name}<button type="button" aria-label="Remove person filter" onClick={() => { setPerson(null); setPage(1); }} className="rounded-full p-0.5 hover:bg-line"><X className="h-3 w-3" /></button></span>}
            {filtered && <Btn variant="ghost" size="sm" onClick={reset}>Clear filters</Btn>}
            {points.data && <span className="ml-auto text-xs text-fg-muted">{points.data.total} {points.data.total === 1 ? 'point' : 'points'}</span>}
          </div>
          {points.error ? <p className="p-4 text-sm text-[var(--tt-danger)]">{points.error}</p>
            : points.loading && !points.data ? <TableSkeleton rows={6} columns={6} />
              : !points.data?.items.length ? <EmptyState compact title="No points match" description="Try fewer filters." />
                : (
                  <>
                    <Table minWidth={860} head={[{ label: 'Point' }, { label: 'Assigned to', className: 'w-48' }, { label: 'Due', className: 'w-32' }, { label: 'Status', className: 'w-36' }, { label: 'Changes', className: 'w-40' }, { label: '', className: 'w-10' }]}>
                      {points.data.items.map((p) => <PointRow key={p.id} p={p} today={points.data!.today} tz={tz} onOpen={() => setOpen(p.id)} onMeeting={() => router.push(`${basePath}/meetings/${p.meeting_id}`)} />)}
                    </Table>
                    {points.data.total > PAGE && <div className="border-t border-line p-2"><Pagination currentPage={page} totalPages={Math.ceil(points.data.total / PAGE)} totalItems={points.data.total} pageSize={PAGE} onPageChange={setPage} /></div>}
                  </>
                )}
        </Panel>
      )}

      {tab === 'activity' && <Activity department={department} person={person} kind={kind} onKind={setKind} onClearPerson={() => setPerson(null)} tz={tz} onOpen={setOpen} />}

      {open && <PointDrawer key={open} id={open} basePath={basePath} onClose={() => setOpen(null)} onChanged={() => { void overview.refetch(); void points.refetch(); }} />}
    </div>
  );
}

/** Picks one employee by name or code (server search, paged); the choice narrows the totals, people, points and activity. */
function EmployeeFind({ person, onPick }: { person: { id: number; name: string } | null; onPick: (p: { id: number; name: string } | null) => void }) {
  const [text, setText] = React.useState('');
  const [needle, setNeedle] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof api.people>>['items']>([]);
  const [total, setTotal] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { const t = setTimeout(() => { setNeedle(text.trim()); setPage(1); }, 250); return () => clearTimeout(t); }, [text]);
  React.useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setBusy(true);
    api.people(needle, null, page).then((r) => { if (!live) return; setRows((prev) => (page === 1 ? r.items : [...prev, ...r.items])); setTotal(r.total); }, () => { if (live && page === 1) { setRows([]); setTotal(0); } }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [open, needle, page]);
  React.useEffect(() => {
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  return (
    <div ref={box} className="relative flex flex-wrap items-center gap-2">
      <div className="flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-80">
        <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
        <input value={text} onChange={(e) => { setText(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Find an employee by name or code" aria-label="Find an employee"
          className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm" />
      </div>
      {person && <span className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-1 pl-3 pr-1.5 text-xs font-semibold text-fg">{person.name}<button type="button" aria-label="Remove employee filter" onClick={() => onPick(null)} className="rounded-full p-0.5 hover:bg-line"><X className="h-3 w-3" /></button></span>}
      {open && (
        <div className="absolute left-0 top-10 z-20 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg sm:w-80">
          <ul className="max-h-64 overflow-y-auto py-1">
            {rows.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => { onPick({ id: r.id, name: r.name }); setText(''); setOpen(false); }} className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-bg-subtle">
                  <span className="text-sm font-semibold text-fg">{r.name}</span>
                  <span className="text-[11px] text-fg-muted">{[r.employee_code, r.department].filter(Boolean).join(' · ') || '—'}</span>
                </button>
              </li>
            ))}
            {!rows.length && !busy && <li className="px-3 py-2 text-xs text-fg-muted">No employee found</li>}
            {busy && <li className="px-3 py-2 text-xs text-fg-muted">Searching…</li>}
          </ul>
          {rows.length < total && !busy && <button type="button" onClick={() => setPage((n) => n + 1)} className="w-full border-t border-line px-3 py-2 text-xs font-semibold text-fg hover:bg-bg-subtle">Show more ({total - rows.length} left)</button>}
        </div>
      )}
    </div>
  );
}

function People({ rows, total, page, onPage, search, onSearch, searching, loading, error, onPick }: {
  rows?: AuditPerson[]; total: number; page: number; onPage: (n: number) => void; search: string; onSearch: (v: string) => void; searching: boolean; loading: boolean; error: string; onPick: (p: AuditPerson) => void;
}) {
  if (error) return <p className="text-sm text-[var(--tt-danger)]">{error}</p>;
  if (loading) return <Panel><TableSkeleton rows={6} columns={8} /></Panel>;
  const bar = <div className="flex items-center justify-between gap-2 border-b border-line p-2"><SearchBox value={search} onChange={onSearch} placeholder="Search people in this list" /><span className="text-xs text-fg-muted">{total} {total === 1 ? 'person' : 'people'}</span></div>;
  if (!rows?.length) {
    return (
      <Panel>
        {(searching || search) && bar}
        <EmptyState compact title={searching ? 'No one matches' : 'No assigned actions yet'} description={searching ? 'Try another name or employee code.' : 'People show here once an action is given to them.'} />
      </Panel>
    );
  }
  return (
    <Panel>
      {bar}
      <Table minWidth={820} head={[{ label: 'Person' }, { label: 'Assigned', className: 'w-24' }, { label: 'Open', className: 'w-20' }, { label: 'Overdue', className: 'w-24' }, { label: 'Done', className: 'w-20' }, { label: 'On time', className: 'w-24' }, { label: 'Sent back', className: 'w-28' }, { label: 'Deleted', className: 'w-24' }]}>
        {rows.map((r) => (
          <tr key={r.employee_id} className="cursor-pointer transition-colors hover:bg-bg-subtle/50" onClick={() => onPick(r)}>
            <td className={td}><span className="font-semibold">{r.name}</span><span className="block text-[11px] text-fg-muted">{r.department || '—'}</span></td>
            <td className={`${td} tabular-nums`}>{r.assigned}</td>
            <td className={`${td} tabular-nums`}>{r.open}</td>
            <td className={`${td} tabular-nums ${r.overdue ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted'}`}>{r.overdue}</td>
            <td className={`${td} tabular-nums`}>{r.done}</td>
            <td className={`${td} tabular-nums text-fg-muted`}>{pct(r.on_time, r.done_with_due)}</td>
            <td className={`${td} tabular-nums ${r.sent_back ? 'font-semibold' : 'text-fg-muted'}`}>{r.sent_back}</td>
            <td className={`${td} tabular-nums text-fg-muted`}>{r.deleted}</td>
          </tr>
        ))}
      </Table>
      {total > PEOPLE_PAGE && <div className="border-t border-line p-2"><Pagination currentPage={page} totalPages={Math.ceil(total / PEOPLE_PAGE)} totalItems={total} pageSize={PEOPLE_PAGE} onPageChange={onPage} /></div>}
    </Panel>
  );
}

function PointRow({ p, today, tz, onOpen, onMeeting }: { p: Point; today: string; tz?: string | null; onOpen: () => void; onMeeting: () => void }) {
  const edits = Math.max(0, (p.version_count ?? 1) - 1);
  return (
    <tr className={cx('cursor-pointer transition-colors hover:bg-bg-subtle/50', p.deleted && 'bg-bg-subtle/40')} onClick={onOpen}>
      <td className={td}>
        <span className={cx('font-semibold', p.deleted && 'text-fg-muted line-through')}>{p.text}</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); onMeeting(); }} className="block text-left text-[11px] text-fg-muted hover:text-fg hover:underline">{p.meeting_title} · {p.kind}</button>
      </td>
      <td className={`${td} text-fg-muted`}>{p.kind === 'action' ? assignLabel(p) || 'Not assigned' : '—'}</td>
      <td className={td}>{p.kind === 'action' && p.due_on ? <span className={cx('text-xs font-semibold', p.due_bucket === 'overdue' ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>{dueText(p.due_on, today)}</span> : <span className="text-fg-muted">—</span>}</td>
      <td className={td}>{p.deleted ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted"><Trash2 className="h-3 w-3" aria-hidden />Deleted</span> : p.status ? <StatusTag status={p.status} /> : <span className="text-fg-muted">—</span>}</td>
      <td className={td}>
        <div className="flex flex-col gap-0.5 text-[11px] text-fg-muted">
          {edits > 0 && <span className="inline-flex items-center gap-1 font-semibold text-fg"><Pencil className="h-3 w-3" aria-hidden />Edited {edits}×{p.last_edited_at ? ` · ${formatDayTime(p.last_edited_at, tz)}` : ''}</span>}
          {p.deleted && <span>By {p.deleted_by_name || 'someone'}{p.deleted_at ? ` · ${formatDate(p.deleted_at.slice(0, 10), 'short')}` : ''}</span>}
          {edits === 0 && !p.deleted && <span>—</span>}
        </div>
      </td>
      <td className={`${td} text-fg-muted`}><Eye className="h-4 w-4" aria-label="Open" /></td>
    </tr>
  );
}

function Activity({ department, person, kind, onKind, onClearPerson, tz, onOpen }: {
  department?: number; person: { id: number; name: string } | null; kind: string; onKind: (k: string) => void; onClearPerson: () => void; tz?: string | null; onOpen: (id: number) => void;
}) {
  const [items, setItems] = React.useState<AuditEvent[]>([]);
  const [more, setMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const load = React.useCallback(async (before?: number) => {
    setLoading(true); setError('');
    try {
      const r = await api.auditActivity({ employee_id: person?.id, department_id: department, kind: kind || undefined, before });
      setItems((cur) => (before ? [...cur, ...r.items] : r.items));
      setMore(r.more);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load'); } finally { setLoading(false); }
  }, [person?.id, department, kind]);
  React.useEffect(() => { void load(); }, [load]);

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <select aria-label="What happened" value={kind} onChange={(e) => onKind(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm">
          <option value="">Everything</option>
          {KIND_OPTIONS.map((k) => <option key={k} value={k}>{(EVENT_LABEL[k] || k).replace(/^./, (c) => c.toUpperCase())}</option>)}
        </select>
        {person && <span className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-1 pl-3 pr-1.5 text-xs font-semibold text-fg">{person.name}<button type="button" aria-label="Remove person filter" onClick={onClearPerson} className="rounded-full p-0.5 hover:bg-line"><X className="h-3 w-3" /></button></span>}
      </div>
      {error ? <p className="p-4 text-sm text-[var(--tt-danger)]">{error}</p>
        : loading && !items.length ? <TableSkeleton rows={6} columns={2} />
          : !items.length ? <EmptyState compact title="Nothing yet" description="What people do with points shows here." />
            : (
              <ol className="divide-y divide-line">
                {items.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => onOpen(e.point_id)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-subtle/50">
                      <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', e.kind === 'deleted' ? 'bg-[var(--tt-danger)]' : e.kind === 'edited' || e.kind === 'reassigned' || e.kind === 'due_changed' ? 'bg-[var(--tt-warning)]' : 'bg-fg-subtle')} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-fg"><span className="font-semibold">{e.actor || 'System'}</span> {EVENT_LABEL[e.kind] || e.kind} <span className={cx('font-semibold', e.deleted && 'line-through')}>“{e.text}”</span></span>
                        <span className="block truncate text-xs text-fg-muted">
                          {e.meeting_title}{e.kind === 'reassigned' || e.kind === 'due_changed' ? ` · ${e.from || 'none'} → ${e.to || 'none'}` : ''}{e.kind === 'edited' && e.note ? ` · ${e.note}` : ''}{(e.kind === 'deleted' || e.kind === 'sent_back') && e.note ? ` · “${e.note}”` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-fg-muted">{formatDayTime(e.at, tz)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
      {more && <div className="border-t border-line p-3 text-center"><Btn variant="secondary" size="sm" loading={loading} onClick={() => void load(items[items.length - 1]?.id)}>Load more</Btn></div>}
    </Panel>
  );
}
