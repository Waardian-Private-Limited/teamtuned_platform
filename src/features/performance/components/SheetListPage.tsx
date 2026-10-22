'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import * as api from '../api/perf.api';
import { CYCLE_STATUS_LABEL, SHEET_STATUS_LABEL } from '../constants/perf.constants';
import type { SheetRow, SheetStatus } from '../types/perf.types';
import { HELP } from '../constants/help';
import { btnClass, PageHead, Panel, SearchBox, Table, td } from './ui';

const tone = (s: SheetStatus) => (s === 'approved' ? 'active' : s === 'revision_requested' ? 'inactive' : 'neutral');
type Filter = 'open' | 'done';
const DONE = ['released', 'closed'];
const STATUS_OPTIONS = (Object.keys(SHEET_STATUS_LABEL) as SheetStatus[]).map((s, i) => ({ value: i, label: SHEET_STATUS_LABEL[s], status: s }));

/** "My goals" (the employee's own sheets) or "Team goals" (sheets of the people they review). */
export function SheetListPage({ mode, basePath }: { mode: 'mine' | 'team'; basePath: string }) {
  const router = useRouter();
  const [items, setItems] = React.useState<SheetRow[] | null>(null);
  const [everyone, setEveryone] = React.useState(false);
  const [error, setError] = React.useState('');
  const [filter, setFilter] = React.useState<Filter>('open');
  const [q, setQ] = React.useState('');
  const [cycleId, setCycleId] = React.useState<number | null>(null);
  const [statusIdx, setStatusIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    (mode === 'mine' ? api.mySheets() : api.teamSheets()).then((d) => { setItems(d.items); setEveryone(Boolean((d as { everyone?: boolean }).everyone)); }).catch((e) => setError(messageOf(e)));
  }, [mode]);

  const cycles = React.useMemo(() => [...new Map((items || []).map((s) => [s.cycle_id, s.cycle_name])).entries()].map(([value, label]) => ({ value, label })), [items]);
  const status = statusIdx === null ? null : STATUS_OPTIONS[statusIdx].status;
  const term = q.trim().toLowerCase();
  const shown = items?.filter((s) =>
    (filter === 'done' ? DONE.includes(s.cycle_status) : !DONE.includes(s.cycle_status))
    && (cycleId === null || s.cycle_id === cycleId)
    && (status === null || s.status === status)
    && (!term || `${s.employee_name} ${s.employee_code || ''} ${s.cycle_name}`.toLowerCase().includes(term)));
  // A manager sees what needs them first: sheets waiting for approval.
  const waiting = mode === 'team' ? (items || []).filter((s) => s.status === 'submitted').length : 0;
  const filtered = Boolean(term || cycleId !== null || statusIdx !== null);
  const clear = () => { setQ(''); setCycleId(null); setStatusIdx(null); };
  const open = (s: SheetRow) => `${basePath}/sheets/${s.id}`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead
        title={mode === 'mine' ? 'My goals' : 'Team goals'}
        count={shown?.length}
        subtitle={mode === 'mine' ? 'Your goals in each cycle' : `${everyone ? 'Every sheet in open cycles' : 'People you review'}${waiting ? ` · ${waiting} waiting for approval` : ''}`}
        help={mode === 'mine' ? HELP.myGoals : HELP.teamGoals}
        actions={<>
          {mode === 'team' && <SearchBox value={q} onChange={setQ} placeholder="Search name or code…" />}
          {cycles.length > 1 && <SearchableFilterDropdown label="Cycle" allLabel="All cycles" value={cycleId} options={cycles} onChange={setCycleId} />}
          {mode === 'team' && <SearchableFilterDropdown label="Status" allLabel="Any status" value={statusIdx} options={STATUS_OPTIONS} onChange={setStatusIdx} />}
          <SegmentedControl<Filter> options={[{ value: 'open', label: 'Current' }, { value: 'done', label: 'Past' }]} value={filter} onChange={setFilter} fitText />
        </>}
      />
      <Panel>
        {error && <div className="border-b border-line p-3"><p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p></div>}
        {shown === undefined && !error && <TableSkeleton rows={5} columns={mode === 'team' ? 5 : 4} />}
        {shown?.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center p-4">
            <EmptyState
              illustration={{ src: mode === 'mine' ? '/vectors/daysummary.svg' : '/vectors/teams.svg', width: 220, height: 160, alt: '' }}
              title={filtered ? 'Nothing matches' : filter === 'done' ? 'No past cycles' : mode === 'mine' ? 'No goal sheet yet' : 'No team goal sheets'}
              description={filtered ? 'Try another name, cycle or status.' : filter === 'done' ? 'Released and closed cycles show here.' : mode === 'mine' ? 'You will get a notification when goal setting opens for you.' : 'When a cycle opens, the goal sheets of the people who report to you appear here.'}
              action={filtered ? { label: 'Clear filters', onClick: clear } : undefined}
            />
          </div>
        )}
        {shown && shown.length > 0 && (
          <>
            <div className="hidden min-h-0 flex-1 md:block">
              <Table head={[
                ...(mode === 'team' ? [{ label: 'Employee' }] : []),
                { label: 'Cycle' },
                { label: 'Period', className: 'w-56' },
                { label: 'Cycle stage', className: 'w-36' },
                { label: 'Goal sheet', className: 'w-40' },
                { label: 'Actions', className: 'w-28 text-right' },
              ]}>
                {shown.map((s) => (
                  <tr key={s.id} onClick={() => router.push(open(s))} className="cursor-pointer transition-colors hover:bg-bg-subtle/50">
                    {mode === 'team' && <td className={td}><span className="font-semibold">{s.employee_name}</span>{s.employee_code && <span className="ml-2 text-[11px] text-fg-muted">{s.employee_code}</span>}</td>}
                    <td className={td}><span className={mode === 'mine' ? 'font-semibold' : ''}>{s.cycle_name}</span></td>
                    <td className={`${td} text-fg-muted`}>{s.period_start} to {s.period_end}</td>
                    <td className={`${td} text-fg-muted`}>{CYCLE_STATUS_LABEL[s.cycle_status]}</td>
                    <td className={td}><StatusPill label={SHEET_STATUS_LABEL[s.status]} tone={tone(s.status)} /></td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      <Link href={open(s)} className={btnClass('secondary', 'sm')}>{mode === 'team' && s.status === 'submitted' ? 'Review' : 'Open'}</Link>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden md:hidden">
              {shown.map((s) => (
                <Link key={s.id} href={open(s)} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-bg-subtle/50">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-semibold text-fg">{mode === 'team' ? s.employee_name : s.cycle_name}</p>
                    <p className="truncate text-[11px] text-fg-muted">{mode === 'team' ? `${s.cycle_name} · ` : ''}{s.period_start} to {s.period_end}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill label={SHEET_STATUS_LABEL[s.status]} tone={tone(s.status)} />
                    <ChevronRight className="h-4 w-4 text-fg-muted" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
