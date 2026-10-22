'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpRight, Crown, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { usePermission } from '@/lib/hooks/usePermission';
import { showError, showSuccess } from '@/lib/toast';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Btn, IconBtn, PageHead, Panel, SearchBox, Table, td } from '@/features/performance/components/ui';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import * as api from '../api/teams.api';
import type { ManagedTeam, MyTeam } from '../api/teams.api';
import { CountsBar, CountsLine, Face, TEAMS_CREATE, TEAMS_MANAGE } from './parts';
import { TeamEditor } from './TeamEditor';

type Tab = 'mine' | 'manage';
const EMPTY_ART = { src: '/vectors/teams.svg', width: 220, height: 160, alt: '' };

/**
 * Teams. `self` (employee area): the teams I am in, and a Manage tab for people who may build teams.
 * `admin` (org portal, no employee record): only managing.
 */
export function TeamsPage({ basePath, mode }: { basePath: string; mode: 'self' | 'admin' }) {
  const router = useRouter();
  const params = useSearchParams();
  const { can } = usePermission();
  const canManage = can(TEAMS_MANAGE);
  const canBuild = canManage || can(TEAMS_CREATE);
  const tab: Tab = mode === 'admin' ? 'manage' : canBuild && params.get('tab') === 'manage' ? 'manage' : 'mine';
  const [editing, setEditing] = React.useState<number | null | 'new'>(null);
  const [reload, setReload] = React.useState(0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead
        title="Teams"
        subtitle={tab === 'mine' ? 'Who is in, on leave or away today, across your teams' : canManage ? 'Build teams and choose their leads' : 'Teams you lead'}
        actions={
          <>
            {mode === 'self' && canBuild && (
              <SegmentedControl<Tab> options={[{ value: 'mine', label: 'My teams' }, { value: 'manage', label: canManage ? 'Manage' : 'Teams I lead' }]} value={tab} onChange={(t) => router.replace(`?tab=${t}`, { scroll: false })} fitText />
            )}
            {tab === 'manage' && canBuild && <Btn icon={Plus} onClick={() => setEditing('new')}>New team</Btn>}
          </>
        }
      />
      {tab === 'mine' ? <MyTeams basePath={basePath} /> : <ManageList key={reload} basePath={basePath} canManage={canManage} onEdit={setEditing} onNew={() => setEditing('new')} />}
      {editing !== null && (
        <TeamEditor
          id={editing === 'new' ? null : editing}
          canManage={canManage}
          onClose={() => setEditing(null)}
          onSaved={(t) => { setEditing(null); setReload((n) => n + 1); showSuccess(editing === 'new' ? `${t.name} created` : 'Team saved'); }}
        />
      )}
    </div>
  );
}

function MyTeams({ basePath }: { basePath: string }) {
  const { data, loading, error, refetch } = useAsync(() => api.mine(), []);
  if (error) return <Panel className="p-4"><p className="text-sm text-[var(--tt-danger)]">{error} <button type="button" className="font-semibold underline" onClick={() => void refetch()}>Try again</button></p></Panel>;
  if (loading && !data) {
    return <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-xl border border-line bg-surface" />)}</div>;
  }
  if (!data?.items.length) {
    return <Panel><EmptyState illustration={EMPTY_ART} title="You are not in a team yet" description="When a manager or HR adds you to a team, it shows here with who is in today." /></Panel>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 overflow-y-auto pb-2 md:grid-cols-2 2xl:grid-cols-3">
      {data.items.map((t) => <TeamTile key={t.key} team={t} href={`${basePath}/teams/${t.key}`} />)}
    </div>
  );
}

function TeamTile({ team, href }: { team: MyTeam; href: string }) {
  const { counts } = team;
  return (
    <Link href={href} className="group flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-xs transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-fg sm:text-base">{team.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-fg-muted">
            {team.is_lead && <span className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-fg"><Crown className="h-2.5 w-2.5" />Lead</span>}
            {team.kind === 'reports' ? 'Reporting team' : team.description || `${counts.total} people`}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-fg-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
      </div>
      <div>
        <div className="mb-2 flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold leading-none tabular-nums text-fg">{counts.present}</span>
          <span className="text-sm text-fg-muted">of {counts.total} in today</span>
        </div>
        <CountsBar counts={counts} />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="flex -space-x-2">
          {team.preview.map((p) => <Face key={p.employee_id} name={p.name} photo={p.photo_url} status={p.status} size="sm" />)}
          {counts.total > team.preview.length + 1 && <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-bg-subtle text-[10px] font-bold text-fg-muted">+{counts.total - team.preview.length - 1}</span>}
        </div>
        <CountsLine counts={{ ...counts, present: 0, off: 0 }} />
      </div>
    </Link>
  );
}

function ManageList({ basePath, canManage, onEdit, onNew }: { basePath: string; canManage: boolean; onEdit: (id: number) => void; onNew: () => void }) {
  const { data, loading, error, refetch } = useAsync(() => api.list(), []);
  const [q, setQ] = React.useState('');
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const items = (data?.items || []).filter((t) => !q.trim() || `${t.name} ${t.leads.map((l) => l.name).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()));
  const askDelete = (t: ManagedTeam) => setConfirm({
    title: `Delete ${t.name}?`, body: 'The team and its member list are removed. People and their attendance are not touched.', cta: 'Delete team', danger: true,
    run: async () => { try { await api.remove(t.id); showSuccess('Team deleted'); await refetch(); } catch (e) { showError(messageOf(e)); } },
  });

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search teams or leads" />
        {data && <p className="text-xs text-fg-muted">{data.items.length} {data.items.length === 1 ? 'team' : 'teams'}{canManage ? '' : ' you lead'}</p>}
      </div>
      {error ? <p className="p-4 text-sm text-[var(--tt-danger)]">{error}</p>
        : loading && !data ? <TableSkeleton rows={5} columns={5} />
          : !data?.items.length ? <EmptyState illustration={EMPTY_ART} title="No teams yet" description={canManage ? 'Group people into teams so leads and teammates see who is in each day.' : 'Build a team of the people you work with to see who is in each day.'} action={{ label: 'New team', onClick: onNew }} />
            : !items.length ? <EmptyState compact title="No team matches" description="Try another name." />
              : (
                <Table minWidth={760} head={[{ label: 'Team' }, { label: 'Leads', className: 'w-56' }, { label: 'People', className: 'w-24' }, { label: 'Today', className: 'w-64' }, { label: 'Actions', className: 'w-28 text-right' }]}>
                  {items.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-bg-subtle/50">
                      <td className={td}>
                        <Link href={`${basePath}/teams/${t.key}`} className="font-semibold text-fg hover:underline">{t.name}</Link>
                        {t.description && <span className="block max-w-md truncate text-[11px] text-fg-muted">{t.description}</span>}
                      </td>
                      <td className={`${td} text-fg-muted`}>{t.leads.map((l) => l.name).join(', ') || '—'}</td>
                      <td className={`${td} tabular-nums`}><span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-fg-muted" />{t.member_count}</span></td>
                      <td className={td}>
                        <div className="space-y-1.5">
                          <CountsBar counts={t.counts} />
                          <p className="text-[11px] text-fg-muted"><span className="font-semibold text-fg">{t.counts.present}</span> of {t.counts.total} in{t.counts.on_leave ? ` · ${t.counts.on_leave} on leave` : ''}{t.counts.absent ? ` · ${t.counts.absent} absent` : ''}</p>
                        </div>
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="inline-flex gap-0.5">
                          <IconBtn label="Edit" onClick={() => onEdit(t.id)}><Pencil className="h-4 w-4" /></IconBtn>
                          <IconBtn label="Delete" onClick={() => askDelete(t)}><Trash2 className="h-4 w-4" /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </Panel>
  );
}
