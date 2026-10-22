'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { usePermission } from '@/lib/hooks/usePermission';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import * as api from '../api/perf.api';
import { CHECK_IN_LABEL, CYCLE_STAGES, CYCLE_STATUS_LABEL, CYCLE_TYPE_LABEL, PERF_PERMISSIONS } from '../constants/perf.constants';
import type { Cycle } from '../types/perf.types';
import { CycleForm } from './CycleForm';
import { Btn, btnClass, cycleTone, PageHead, Panel, Progress, SearchBox, Table, td } from './ui';

type Filter = 'open' | 'closed';

export function CyclesPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const { can } = usePermission();
  const canEdit = can(PERF_PERMISSIONS.CYCLES);
  const [filter, setFilter] = React.useState<Filter>('open');
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [q, setQ] = React.useState('');
  const [items, setItems] = React.useState<Cycle[] | null>(null);
  const [error, setError] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(() => {
    setError('');
    api.listCycles('all', subOrgId).then((d) => setItems(d.items)).catch((e) => setError(messageOf(e)));
  }, [subOrgId]);
  React.useEffect(() => { setItems(null); load(); }, [load]);

  const term = q.trim().toLowerCase();
  const shown = items?.filter((c) => (filter === 'closed' ? c.status === 'closed' : c.status !== 'closed') && (!term || c.name.toLowerCase().includes(term)));
  const href = (c: Cycle) => `${basePath}/cycles/${c.id}`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title="Review cycles" count={shown?.length} subtitle="One review period, e.g. FY 2025-26" help={HELP.cycles}
        actions={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search cycles…" />
          <SegmentedControl<Filter> options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} value={filter} onChange={setFilter} fitText />
          <SubOrgFilter value={subOrgId} onChange={setSubOrgId} />
          {canEdit && <Btn icon={Plus} onClick={() => setCreating(true)}>New cycle</Btn>}
        </>} />
      <Panel>
        {error && <div className="border-b border-line p-3"><p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p></div>}
        {shown === undefined && !error && <TableSkeleton rows={5} columns={5} />}
        {shown?.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center p-4">
            <EmptyState
              illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }}
              title={term ? 'Nothing matches' : filter === 'open' ? 'No open cycles' : 'No closed cycles'}
              description={term ? 'Try another name.' : filter === 'open' ? (canEdit ? 'Create a cycle such as FY 2025-26, split it into quarters or your own breaks, then invite employees.' : 'Cycles that HR opens will show here.') : 'Cycles move here once they are closed.'}
              action={term ? { label: 'Clear search', onClick: () => setQ('') } : filter === 'open' && canEdit ? { label: 'New cycle', onClick: () => setCreating(true) } : undefined}
            />
          </div>
        )}
        {shown && shown.length > 0 && (
          <>
            <div className="hidden min-h-0 flex-1 md:block">
              <Table minWidth={760} head={[
                { label: 'Cycle' },
                { label: 'Breaks', className: 'w-44' },
                { label: 'Stage', className: 'w-40' },
                { label: 'Goal sheets approved', className: 'w-56' },
                { label: 'Actions', className: 'w-28 text-right' },
              ]}>
                {shown.map((c) => {
                  const stage = CYCLE_STAGES.findIndex((s) => s.status === c.status);
                  return (
                    <tr key={c.id} onClick={() => router.push(href(c))} className="cursor-pointer transition-colors hover:bg-bg-subtle/50">
                      <td className={td}>
                        <span className="inline-flex flex-wrap items-center gap-2 font-semibold">{c.name}<SubOrgBadge subOrgId={c.sub_organization_id} /></span>
                        <span className="mt-0.5 block text-[11px] text-fg-muted">{CYCLE_TYPE_LABEL[c.cycle_type]} · {c.period_start} to {c.period_end}</span>
                      </td>
                      <td className={`${td} text-fg-muted`}>{CHECK_IN_LABEL[c.check_in]}</td>
                      <td className={td}>
                        <StatusPill label={CYCLE_STATUS_LABEL[c.status]} tone={cycleTone(c.status)} />
                        <span className="mt-1 block text-[11px] text-fg-muted">Stage {stage + 1} of {CYCLE_STAGES.length}</span>
                      </td>
                      <td className={td}>
                        <span className="mb-1 block text-[11px] text-fg-muted">{c.approved_count ?? 0} of {c.sheet_count ?? 0}</span>
                        <Progress value={c.approved_count ?? 0} total={c.sheet_count ?? 0} />
                      </td>
                      <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                        <Link href={href(c)} className={btnClass('secondary', 'sm')}>Open</Link>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden md:hidden">
              {shown.map((c) => (
                <Link key={c.id} href={href(c)} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-bg-subtle/50">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-semibold text-fg">{c.name}</p>
                    <p className="truncate text-[11px] text-fg-muted">{c.period_start} to {c.period_end} · {CHECK_IN_LABEL[c.check_in]}</p>
                    <Progress value={c.approved_count ?? 0} total={c.sheet_count ?? 0} />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill label={CYCLE_STATUS_LABEL[c.status]} tone={cycleTone(c.status)} />
                    <ChevronRight className="h-4 w-4 text-fg-muted" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Panel>
      {creating && <CycleForm open cycle={null} subOrgId={subOrgId} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}
