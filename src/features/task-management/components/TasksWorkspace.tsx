'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CalendarDays, CheckCircle2, Columns3, Hourglass, List, ListTodo, Loader, Plus, UserCheck, X } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Btn, PageHeader, Tile } from '@/features/data-collection/components/shared/Ui';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import * as api from '../api/tm.api';
import { TM_PERMISSIONS } from '../constants/tm.constants';
import type { Filters, Scope, ScopeCounts, ViewMode } from '../types/tm.types';
import { CreateTaskDialog } from './CreateTaskDialog';
import { FilterBar } from './FilterBar';
import { TaskDrawer } from './TaskDrawer';
import { BoardView } from './views/BoardView';
import { CalendarView } from './views/CalendarView';
import { ListView } from './views/ListView';

const VIEW_KEY = 'tt.tasks.view';
const VIEWS: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: 'list', label: 'List', icon: List },
  { value: 'board', label: 'Board', icon: Columns3 },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
];
type TileKey = 'todo' | 'doing' | 'review' | 'done' | 'overdue';
// The same four cards on every tab, worded for what that tab means.
const TILES: Record<Exclude<Scope, 'all'> | 'all', { key: TileKey; label: string; icon: typeof List }[]> = {
  mine: [{ key: 'todo', label: 'To do', icon: ListTodo }, { key: 'doing', label: 'In progress', icon: Loader }, { key: 'overdue', label: 'Overdue', icon: AlertTriangle }, { key: 'done', label: 'Done', icon: CheckCircle2 }],
  assigned: [{ key: 'todo', label: 'Not started', icon: ListTodo }, { key: 'doing', label: 'In progress', icon: Loader }, { key: 'review', label: 'Waiting for review', icon: Hourglass }, { key: 'overdue', label: 'Overdue', icon: AlertTriangle }],
  review: [{ key: 'review', label: 'Waiting for you', icon: UserCheck }, { key: 'doing', label: 'Still in progress', icon: Loader }, { key: 'overdue', label: 'Overdue', icon: AlertTriangle }, { key: 'done', label: 'Approved', icon: CheckCircle2 }],
  all: [{ key: 'todo', label: 'To do', icon: ListTodo }, { key: 'doing', label: 'In progress', icon: Loader }, { key: 'review', label: 'In review', icon: Hourglass }, { key: 'overdue', label: 'Overdue', icon: AlertTriangle }],
};
const STATUS_TABS = [{ value: 'open', label: 'Open' }, { value: 'todo', label: 'To do' }, { value: 'doing', label: 'In progress' }, { value: 'review', label: 'In review' }, { value: 'done', label: 'Done' }, { value: 'all', label: 'All' }] as const;
type StatusTab = (typeof STATUS_TABS)[number]['value'];

function readView(fallback: ViewMode): ViewMode {
  try { const v = window.localStorage.getItem(VIEW_KEY) as ViewMode | null; return v && VIEWS.some((x) => x.value === v) ? v : fallback; } catch { return fallback; }
}

/**
 * One tasks screen for everyone. "personal" = For me / Assigned by me / To review; "all" = the organization view for
 * reviewers and admins (filters + the same three views). Views: List, Board, Calendar (remembered per browser).
 */
export function TasksWorkspace({ mode }: { mode: 'personal' | 'all' }) {
  const { can } = usePermission();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const canCreate = can(TM_PERMISSIONS.CREATE);
  const scopeParam = params.get('scope') as Scope | null;
  const scope: Scope = mode === 'all' ? 'all' : scopeParam === 'assigned' || scopeParam === 'review' ? scopeParam : 'mine';
  const [view, setViewState] = useState<ViewMode>((params.get('view') as ViewMode) || 'list');
  const [status, setStatus] = useState<StatusTab>('open');
  const [filters, setFilters] = useState<Filters>({});
  const [debounced, setDebounced] = useState<Filters>({});
  // ?task=<id> opens that task straight away (links from the dashboard).
  const [open, setOpen] = useState<number | null>(() => Number(params.get('task')) || null);
  const [creating, setCreating] = useState<{ due?: string } | null>(null);
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const counts = useAsync(() => api.mine('todo'), [version], mode === 'personal');
  const tiles = useAsync(() => api.counts(scope), [scope, version]);

  useEffect(() => { if (!params.get('view')) setViewState(readView('list')); }, [params]);
  useEffect(() => { const t = setTimeout(() => setDebounced(filters), 300); return () => clearTimeout(t); }, [filters]);

  const setView = (v: ViewMode) => { setViewState(v); try { window.localStorage.setItem(VIEW_KEY, v); } catch { /* private window */ } };
  const setScope = (s: Scope) => { const q = new URLSearchParams(params.toString()); if (s === 'mine') q.delete('scope'); else q.set('scope', s); router.replace(`${pathname}${q.toString() ? `?${q}` : ''}`); };

  const c = counts.data?.counts;
  const scopes: { value: Scope; label: string }[] = [
    { value: 'mine', label: c ? `For me · ${c.todo + c.doing}` : 'For me' },
    ...(canCreate ? [{ value: 'assigned' as Scope, label: 'Assigned by me' }] : []),
    { value: 'review', label: c ? `To review · ${c.review}` : 'To review' },
  ];
  // "open" = not done and not cancelled; the other tabs are the board's column groups.
  const listStatus = status !== 'all' && (mode === 'personal' || status !== 'open') ? status : undefined;

  return (
    <div className="mx-auto max-w-[96rem] p-4 sm:p-6">
      <PageHeader
        title={mode === 'all' ? 'All tasks' : 'My tasks'}
        subtitle={mode === 'all' ? 'Every task in your scope, as a list, a board or a calendar.' : 'Your work, what you handed out and what waits for your review.'}
        actions={canCreate || mode === 'personal' ? <Btn variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating({})}>New task</Btn> : undefined}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TILES[scope].map(({ key, label, icon }) => (
          <Tile key={key} icon={icon} label={label} value={tiles.data ? (tiles.data as ScopeCounts)[key] : '–'}
            onClick={() => { setView('list'); if (key === 'overdue') { setStatus('open'); setFilters((f) => ({ ...f, due: 'overdue' })); } else { setStatus(key); setFilters((f) => ({ ...f, due: f.due === 'overdue' ? '' : f.due, status: mode === 'all' ? '' : f.status })); } }} />
        ))}
      </div>
      {mode === 'all' && status !== 'open' && status !== 'all' && view === 'list' && (
        <button type="button" onClick={() => setStatus('open')} className="mb-3 mr-2 inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-semibold text-fg">{STATUS_TABS.find((t) => t.value === status)?.label} only<X className="h-3 w-3" /></button>
      )}
      {mode === 'personal' && filters.due === 'overdue' && (
        <button type="button" onClick={() => setFilters((f) => ({ ...f, due: '' }))} className="mb-3 inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-semibold text-[var(--tt-danger)]">Overdue only<X className="h-3 w-3" /></button>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Chip rows scroll sideways on a phone instead of pushing the page wider. */}
        {mode === 'personal' ? <div className="min-w-0 max-w-full overflow-x-auto"><SegmentedControl options={scopes} value={scope} onChange={setScope} fitText /></div> : <span />}
        <div role="tablist" aria-label="View" className="inline-flex shrink-0 rounded-lg border border-line bg-surface p-0.5">
          {VIEWS.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => setView(value)}
              className={cx('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors', view === value ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg')}>
              <Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span><span className="sr-only sm:hidden">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === 'all' && <FilterBar value={filters} onChange={setFilters} withStatus={view === 'list'} />}
      {mode === 'personal' && view === 'list' && <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"><SegmentedControl options={STATUS_TABS} value={status} onChange={setStatus} fitText /></div>}

      {view === 'list' && <ListView scope={scope} filters={debounced} status={listStatus} onOpen={setOpen} version={version} />}
      {view === 'board' && <BoardView scope={scope} filters={debounced} onOpen={setOpen} version={version} onChanged={bump} />}
      {view === 'calendar' && <CalendarView scope={scope} filters={debounced} onOpen={setOpen} version={version} onNewTask={canCreate || mode === 'personal' ? (due) => setCreating({ due }) : undefined} />}

      <TaskDrawer id={open} onClose={() => setOpen(null)} onChanged={bump} />
      <CreateTaskDialog open={creating !== null} presetDue={creating?.due} onClose={() => setCreating(null)} onCreated={bump} />
    </div>
  );
}
