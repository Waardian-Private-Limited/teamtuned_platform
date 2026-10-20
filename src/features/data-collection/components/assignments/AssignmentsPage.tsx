'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Pause, Pencil, Play, Plus, Search, Square } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { usePermission } from '@/lib/hooks/usePermission';
import * as api from '../../api/dc.api';
import { DC_PERMISSIONS, WEEKDAYS } from '../../constants/dc.constants';
import { useAsync } from '../../hooks/useAsync';
import type { AssignmentRow, Schedule } from '../../types/dc.types';
import { Bar, Btn, Card, PageHeader, Pill, Skeleton, inputCls } from '../shared/Ui';
import { AssignmentWizard } from './AssignmentWizard';

type Tab = 'active' | 'paused' | 'ended';

export const describeSchedule = (a: AssignmentRow) => {
  if (a.mode === 'open') return `Open any time${a.flags.daily_limit ? ` · ${a.flags.daily_limit}/day` : ''}`;
  const s = a.schedule as Schedule | null;
  if (!s) return '';
  const base = s.kind === 'daily' ? 'Every day' : s.kind === 'weekly' ? (s.weekdays || []).map((d) => WEEKDAYS[d]).join(', ') : s.kind === 'monthly' ? `Monthly on ${(s.month_days || []).join(', ')}` : s.kind === 'every_n_days' ? `Every ${s.interval} days` : s.kind === 'dates' ? `${(s.dates || []).length} dates` : 'Once';
  return `${base} · due ${s.due_time}`;
};
export const describeWho = (a: AssignmentRow) => {
  const k = a.target.who.kind;
  const n = a.target.who.ids?.length || 0;
  const where = 'all' in a.target.sites ? 'all sites' : `${a.target.sites.ids.length} site${a.target.sites.ids.length === 1 ? '' : 's'}`;
  const who = k === 'everyone' ? 'Everyone' : k === 'one_per_site' ? 'One per site' : k === 'employees' ? `${n} people` : k === 'roles' ? `${n} role${n === 1 ? '' : 's'}` : `${n} department${n === 1 ? '' : 's'}`;
  return `${who} · ${where}`;
};

export function AssignmentsPage() {
  const { can } = usePermission();
  const canAssign = can(DC_PERMISSIONS.ASSIGN);
  const params = useSearchParams();
  const presetForm = Number(params.get('form')) || null;
  const [tab, setTab] = useState<Tab>('active');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  const { data, loading, error, refetch } = useAsync(() => api.listAssignments({ status: tab, search: query || undefined, page, pageSize: 20 }), [tab, query, page]);
  const [wizard, setWizard] = useState<{ existing: AssignmentRow | null } | null>(presetForm ? { existing: null } : null);
  const [detail, setDetail] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const open = useAsync(() => api.getAssignment(detail as number), [detail], detail !== null);

  const act = async (id: number, action: 'pause' | 'resume' | 'end') => {
    try { await api.assignmentAction(id, action); showSuccess(action === 'end' ? 'Assignment ended' : action === 'pause' ? 'Assignment paused' : 'Assignment resumed'); await refetch(); if (detail === id) await open.refetch(); } catch (e) { showError(messageOf(e)); }
  };
  const items = data?.items || [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <PageHeader title="Assignments" subtitle="Who fills which form, where and when." actions={canAssign && <Btn variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setWizard({ existing: null })}>New assignment</Btn>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl<Tab> value={tab} onChange={(t) => { setTab(t); setPage(1); }} options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'ended', label: 'Ended' }]} />
        <div className="relative min-w-0 flex-1 basis-56 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" /><input aria-label="Search assignments" className={`${inputCls()} pl-9`} placeholder="Search title or form" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
      </div>
      {error && <p className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {loading && !data ? (
        <Card className="!p-0 overflow-hidden" aria-busy="true">
          <div className="hidden border-b border-line bg-bg-subtle px-4 py-2.5 md:block"><Skeleton className="h-4 w-1/3" /></div>
          <div className="divide-y divide-line">{Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3"><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div><Skeleton className="hidden h-4 w-28 md:block" /><Skeleton className="hidden h-4 w-32 md:block" /><Skeleton className="hidden h-2 w-24 md:block" /><Skeleton className="h-5 w-14" /></div>
          ))}</div>
        </Card>
      ) : items.length === 0 ? (
          <Card className="flex flex-col items-center py-10 text-center"><Image src="/vectors/flow.svg" alt="" width={200} height={140} className="mb-4 h-auto max-h-36 w-auto" /><h3 className="text-sm font-bold text-fg">{query ? 'No assignments match' : tab === 'active' ? 'Nothing assigned yet' : `No ${tab} assignments`}</h3><p className="mt-1 max-w-sm text-xs text-fg-muted">{query ? 'Try another title or form name.' : canAssign ? 'Assign a live form to sites and people. It takes four short steps.' : 'Assignments will appear here.'}</p></Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="hidden border-b border-line bg-bg-subtle text-xs text-fg-muted md:table-header-group">
                <tr><th className="px-4 py-2.5 font-semibold">Assignment</th><th className="px-3 py-2.5 font-semibold">Who</th><th className="px-3 py-2.5 font-semibold">When</th><th className="px-3 py-2.5 font-semibold">Today</th><th className="px-3 py-2.5 font-semibold">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((a) => (
                  <tr key={a.id} tabIndex={0} onClick={() => setDetail(a.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetail(a.id); } }} aria-label={`Open ${a.title}`}
                    className="flex cursor-pointer flex-wrap items-center gap-x-3 px-4 py-3 outline-none hover:bg-bg-subtle focus-visible:bg-bg-subtle md:table-row md:p-0">
                    <td className="min-w-0 flex-1 basis-full md:max-w-xs md:px-4 md:py-3">
                      <span className="block break-words font-semibold text-fg">{a.title}</span>
                      <span className="line-clamp-1 text-xs text-fg-muted">{a.form_name}</span>
                    </td>
                    <td className="py-1 text-xs text-fg-muted md:px-3 md:py-3 md:text-sm">{describeWho(a)}</td>
                    <td className="py-1 text-xs text-fg-muted md:px-3 md:py-3 md:text-sm">{describeSchedule(a)}</td>
                    <td className="basis-full py-1 md:w-40 md:basis-auto md:px-3 md:py-3">
                      {a.mode === 'scheduled'
                        ? <div><div className="mb-1 text-[11px] text-fg-muted">{a.today.done} of {a.today.total} filled{a.today.missed ? ` · ${a.today.missed} missed` : ''}</div><Bar value={a.today.done} total={a.today.total} /></div>
                        : <span className="text-xs text-fg-muted">Open form</span>}
                    </td>
                    <td className="ml-auto py-1 md:ml-0 md:px-3 md:py-3"><Pill label={a.status} tone={a.status === 'active' ? 'strong' : 'neutral'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      {data && data.total > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted"><span>{data.total} assignment{data.total === 1 ? '' : 's'}{loading ? ' · loading…' : ''}</span>{pages > 1 && <div className="flex items-center gap-2"><Btn disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</Btn><span>Page {page} of {pages}</span><Btn disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Next</Btn></div>}</div>}

      <Drawer open={detail !== null} onClose={() => setDetail(null)} title={open.data?.title || 'Assignment'} maxWidthClassName="sm:max-w-lg">
        {open.data && (() => {
          const a = open.data;
          return (
            <div className="space-y-5 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2"><Pill label={a.status} tone={a.status === 'active' ? 'strong' : 'neutral'} /><Pill label={a.mode === 'open' ? 'Open' : 'Scheduled'} /><span className="text-xs text-fg-muted">{a.form_name}</span></div>
              <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-xs"><dt className="text-fg-muted">Who</dt><dd className="font-semibold text-fg">{describeWho(a)}</dd><dt className="text-fg-muted">When</dt><dd className="font-semibold text-fg">{describeSchedule(a)}</dd><dt className="text-fg-muted">Runs</dt><dd className="font-semibold text-fg">{a.start_date}{a.end_date ? ` to ${a.end_date}` : ' onwards'}</dd><dt className="text-fg-muted">Rules</dt><dd className="font-semibold text-fg">{Object.entries(a.flags).filter(([, v]) => v === true).map(([k]) => k.replace(/_/g, ' ')).join(', ') || 'None'}</dd></dl>
              {a.mode === 'scheduled' && (
                <div><h3 className="mb-2 text-sm font-bold text-fg">Today by site</h3>
                  {a.sites && a.sites.length ? <ul className="space-y-3">{a.sites.map((s) => <li key={s.site_id}><div className="mb-1 flex justify-between text-xs"><span className="truncate font-semibold text-fg">{s.site_name || 'No site'}</span><span className="text-fg-muted">{s.done}/{s.total}{s.missed ? ` · ${s.missed} missed` : ''}</span></div><Bar value={s.done} total={s.total} /></li>)}</ul> : <p className="text-xs text-fg-muted">Nothing is due today.</p>}
                </div>
              )}
              {canAssign && a.status !== 'ended' && (
                <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                  <Btn icon={<Pencil className="h-4 w-4" />} onClick={() => { setDetail(null); setWizard({ existing: a }); }}>Edit</Btn>
                  {a.status === 'active' ? <Btn icon={<Pause className="h-4 w-4" />} onClick={() => act(a.id, 'pause')}>Pause</Btn> : <Btn icon={<Play className="h-4 w-4" />} onClick={() => act(a.id, 'resume')}>Resume</Btn>}
                  <Btn variant="danger" icon={<Square className="h-4 w-4" />} onClick={() => setConfirm({ title: 'End this assignment?', danger: true, cta: 'End assignment', body: 'No new forms will be created. Forms already filled stay. This cannot be undone.', run: () => act(a.id, 'end') })}>End</Btn>
                </div>
              )}
            </div>
          );
        })()}
        {open.loading && !open.data && <div className="p-6"><Skeleton className="h-40" /></div>}
      </Drawer>

      <AssignmentWizard open={wizard !== null} existing={wizard?.existing || null} presetFormId={presetForm} onClose={() => setWizard(null)} onDone={() => void refetch()} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
