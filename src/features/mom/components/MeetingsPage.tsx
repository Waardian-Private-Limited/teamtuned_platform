'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { formatDayTime } from '@/lib/datetime';
import { useAuth } from '@/providers/auth-provider';
import { usePermission } from '@/lib/hooks/usePermission';
import { showSuccess } from '@/lib/toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/FormControls';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { Btn, PageHead, Panel, SearchBox, Table, td } from '@/features/performance/components/ui';
import * as api from '../api/mom.api';
import { MeetingEditor } from './MeetingEditor';
import { MEETING_STATUS, MOM_CREATE, MOM_MANAGE } from './parts';

type When = 'upcoming' | 'past';
const EMPTY_ART = { src: '/vectors/employees.svg', width: 220, height: 160, alt: '' };
const PAGE_SIZE = 20;

/** Every meeting this person organizes, is invited to or owns an action in; HR sees them all and can narrow to their own. */
export function MeetingsPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const { organization, employee_id } = useAuth();
  const tz = organization?.timezone;
  const { can } = usePermission();
  const manager = can(MOM_MANAGE);
  const canCreate = manager || can(MOM_CREATE);
  const [when, setWhen] = React.useState<When>('upcoming');
  const [q, setQ] = React.useState('');
  const [needle, setNeedle] = React.useState('');
  const [mine, setMine] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [subOrg, setSubOrg] = React.useState<number | null>(null);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => { const t = setTimeout(() => { setNeedle(q.trim()); setPage(1); }, 250); return () => clearTimeout(t); }, [q]);
  const { data, loading, error } = useAsync(() => api.meetings({ when, q: needle || undefined, mine: manager && mine, page, pageSize: PAGE_SIZE, subOrgId: manager ? subOrg : null }), [when, needle, mine, page, subOrg]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead
        title="Meetings"
        count={data?.total}
        subtitle="Schedule meetings, record points and follow the actions through"
        actions={
          <>
            <SearchBox value={q} onChange={setQ} placeholder="Search meetings" />
            <SegmentedControl<When> options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} value={when} onChange={(v) => { setWhen(v); setPage(1); }} fitText />
            {manager && <SubOrgFilter value={subOrg} onChange={(v) => { setSubOrg(v); setPage(1); }} allLabel="All companies" />}
            {manager && employee_id && <Chip active={mine} onClick={() => { setMine(!mine); setPage(1); }}>Only mine</Chip>}
            {canCreate && <Btn icon={Plus} onClick={() => setCreating(true)}>New meeting</Btn>}
          </>
        }
      />
      <Panel>
        {error ? <p className="p-4 text-sm text-[var(--tt-danger)]">{error}</p>
          : loading && !data ? <TableSkeleton rows={6} columns={5} />
            : !data?.items.length ? (
              <EmptyState illustration={EMPTY_ART} compact={Boolean(needle)} title={needle ? 'No meeting matches' : when === 'upcoming' ? 'No upcoming meetings' : 'No past meetings'}
                description={needle ? 'Try another word.' : canCreate && when === 'upcoming' ? 'Schedule one and invite the people who need to be there.' : 'Meetings you are invited to show here.'}
                action={!needle && canCreate && when === 'upcoming' ? { label: 'New meeting', onClick: () => setCreating(true) } : undefined} />
            ) : (
              <>
                <Table minWidth={720} head={[{ label: 'Meeting' }, { label: 'When', className: 'w-52' }, { label: 'Organizer', className: 'w-44' }, { label: 'Actions', className: 'w-28' }, { label: 'Status', className: 'w-44' }]}>
                  {data.items.map((m) => (
                    <tr key={m.id} className="cursor-pointer transition-colors hover:bg-bg-subtle/50" onClick={() => router.push(`${basePath}/meetings/${m.id}`)}>
                      <td className={td}>
                        <Link href={`${basePath}/meetings/${m.id}`} className="font-semibold text-fg hover:underline" onClick={(e) => e.stopPropagation()}>{m.title}</Link>
                        {m.source === 'dpr' && <span className="ml-2 rounded border border-line bg-bg-subtle px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-fg-muted">DPR</span>}
                        <span className="block text-[11px] text-fg-muted">{[m.place, `${m.attendee_count ?? 0} people`, `${m.point_count ?? 0} points`].filter(Boolean).join(' · ')}</span>
                      </td>
                      <td className={`${td} text-fg-muted`}>{formatDayTime(m.starts_at, tz)}</td>
                      <td className={`${td} text-fg-muted`}>{m.organizer_name || '—'}{m.organizer_employee_id === employee_id ? ' (you)' : ''}</td>
                      <td className={`${td} tabular-nums`}>{m.open_actions ? <span className="font-semibold">{m.open_actions} open</span> : <span className="text-fg-muted">None open</span>}</td>
                      <td className={td}>{m.source === 'dpr' ? <StatusPill label="Site month (DPR)" tone="neutral" /> : <StatusPill label={MEETING_STATUS[m.status].label} tone={MEETING_STATUS[m.status].tone} />}</td>
                    </tr>
                  ))}
                </Table>
                {data.total > PAGE_SIZE && (
                  <div className="border-t border-line p-2">
                    <Pagination currentPage={page} totalPages={Math.ceil(data.total / PAGE_SIZE)} totalItems={data.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
                  </div>
                )}
              </>
            )}
      </Panel>
      {creating && (
        <MeetingEditor canManage={manager} hasEmployee={Boolean(employee_id)} onClose={() => setCreating(false)}
          onSaved={(d) => { setCreating(false); showSuccess('Meeting scheduled'); router.push(`${basePath}/meetings/${d.meeting.id}`); }} />
      )}
    </div>
  );
}
