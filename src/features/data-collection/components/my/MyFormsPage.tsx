'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarClock, ClipboardList, Undo2 } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import * as api from '../../api/dc.api';
import { RUN_LABEL, SUBMISSION_LABEL } from '../../constants/dc.constants';
import { useAsync } from '../../hooks/useAsync';
import type { MyRun } from '../../types/dc.types';
import { Btn, Card, PageHeader, Pill, Skeleton, Tile, statusTone } from '../shared/Ui';
import { SubmissionDrawer } from '../submissions/SubmissionsPage';

type View = 'today' | 'overdue' | 'upcoming' | 'done' | 'missed';
const when = (r: MyRun) => `${r.display === 'upcoming' ? 'Opens' : 'Due'} ${new Date(r.display === 'upcoming' ? r.opens_at : r.due_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;

export function MyFormsPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>('today');
  const summary = useAsync(() => api.mySummary(), [view]);
  const runs = useAsync(() => api.myRuns(view), [view]);
  const open = useAsync(() => api.myOpenForms(), []);
  const done = useAsync(() => api.mySubmissions(), [], view === 'done');
  const [sub, setSub] = useState<number | null>(null);
  const s = summary.data;
  const items = runs.data?.items || [];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader title="My forms" subtitle="Forms waiting for you, and ones you can fill any time." />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={ClipboardList} label="To fill" value={s?.today ?? '–'} onClick={() => setView('today')} />
        <Tile icon={AlertTriangle} label="Overdue" value={s?.overdue ?? '–'} onClick={() => setView('overdue')} />
        <Tile icon={Undo2} label="Sent back" value={s?.returned ?? '–'} onClick={() => setView('done')} />
        <Tile icon={CalendarClock} label="Coming up" value={s?.upcoming ?? '–'} onClick={() => setView('upcoming')} />
      </div>

      {open.data && open.data.length > 0 && (
        <Card title="Fill any time" className="mb-4">
          <ul className="divide-y divide-line">{open.data.map((f) => (
            <li key={f.assignment_id} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><div className="truncate text-sm font-semibold text-fg">{f.title}</div><div className="truncate text-xs text-fg-muted">{f.form_name}</div></div><Btn variant="primary" onClick={() => router.push(`${basePath}/my/open/${f.assignment_id}`)}>Fill</Btn></li>
          ))}</ul>
        </Card>
      )}

      <div className="mb-3 overflow-x-auto"><SegmentedControl<View> fitText value={view} onChange={setView} options={[{ value: 'today', label: 'To fill' }, { value: 'overdue', label: 'Overdue' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'done', label: 'Done' }, { value: 'missed', label: 'Missed' }]} /></div>
      {runs.error && <p className="mb-3 text-sm text-[var(--tt-danger)]">{runs.error}</p>}
      {runs.loading && !runs.data ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        : items.length === 0 ? (
          <Card className="flex flex-col items-center py-8 text-center"><Image src="/vectors/daysummary.svg" alt="" width={180} height={120} className="mb-3 h-auto max-h-28 w-auto" /><h3 className="text-sm font-bold text-fg">{view === 'today' ? 'You are all caught up' : 'Nothing here'}</h3><p className="mt-1 text-xs text-fg-muted">{view === 'today' ? 'No forms are waiting right now.' : 'Forms will show up here when they apply.'}</p></Card>
        ) : (
          <ul className="space-y-2">{items.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-surface p-3.5 shadow-[var(--tt-shadow-sm)]">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-bold text-fg">{r.title}</div><div className="truncate text-xs text-fg-muted">{r.site_name || 'No site'}{r.shared ? ' · shared with the site' : ''}</div></div><Pill label={RUN_LABEL[r.display]} tone={statusTone(r.display)} /></div>
              <div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-fg-muted">{when(r)}</span>
                {['open', 'overdue', 'in_progress', 'returned'].includes(r.display) ? <Btn variant="primary" onClick={() => router.push(`${basePath}/my/fill/${r.id}`)}>{r.display === 'returned' ? 'Fix and resend' : 'Fill'}</Btn>
                  : r.display === 'upcoming' ? <span className="text-[11px] text-fg-subtle">Not open yet</span> : null}
              </div>
            </li>
          ))}</ul>
        )}

      {view === 'done' && done.data && done.data.items.length > 0 && (
        <Card title="My submissions" className="mt-4">
          <ul className="divide-y divide-line">{done.data.items.map((x) => (
            <li key={x.id}><button type="button" onClick={() => setSub(x.id)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left"><div className="min-w-0"><div className="truncate text-sm font-semibold text-fg">{x.form_name}</div><div className="truncate text-xs text-fg-muted">{x.work_date}{x.site_name ? ` · ${x.site_name}` : ''}</div></div><Pill label={SUBMISSION_LABEL[x.status] || x.status} tone={statusTone(x.status)} /></button></li>
          ))}</ul>
        </Card>
      )}
      <SubmissionDrawer id={sub} mine onClose={() => setSub(null)} />
    </div>
  );
}
