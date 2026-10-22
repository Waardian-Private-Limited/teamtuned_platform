'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dialog } from '@/components/ui/Dialog';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { usePermission } from '@/lib/hooks/usePermission';
import * as api from '../api/perf.api';
import { PERF_PERMISSIONS, PIP_STATUS_LABEL } from '../constants/perf.constants';
import { errorsOf, type FieldErrors } from '../hooks/useResource';
import type { Pip, PipSuggestion, PersonOption } from '../types/perf.types';
import { Btn, btnClass, IconBtn, PageHead, Panel, SearchBox, Table, td } from './ui';

type Scope = 'mine' | 'team' | 'all';
type Show = 'open' | 'closed';
interface Draft { employee: { id: number; name: string } | null; sheetId: number | null; title: string; reason: string; start: string; end: string; objectives: { objective: string; measure: string; due: string }[] }

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const blank = (): Draft => ({ employee: null, sheetId: null, title: '', reason: '', start: today(), end: inDays(60), objectives: [{ objective: '', measure: '', due: '' }] });
const tone = (s: Pip['status']) => (s === 'closed' ? 'terminated' : s === 'active' ? 'active' : 'neutral');

/** Improvement plans: mine, my team's, or everyone's; plus people whose released rating suggests one. */
export function PipsPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const { can } = usePermission();
  const manager = can(PERF_PERMISSIONS.PIP);
  const [scope, setScope] = React.useState<Scope>('mine');
  const [show, setShow] = React.useState<Show>('open');
  const [items, setItems] = React.useState<Pip[] | null>(null);
  const [suggestions, setSuggestions] = React.useState<PipSuggestion[]>([]);
  const [error, setError] = React.useState('');
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [busy, setBusy] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [people, setPeople] = React.useState<PersonOption[]>([]);

  const load = React.useCallback(() => {
    setItems(null); setError('');
    api.listPips(scope, show).then((d) => setItems(d.items)).catch((e) => { setItems([]); setError(messageOf(e)); });
  }, [scope, show]);
  React.useEffect(load, [load]);
  React.useEffect(() => { api.pipSuggestions().then((d) => setSuggestions(d.items)).catch(() => setSuggestions([])); }, []);
  React.useEffect(() => {
    if (!draft || q.trim().length < 2) { setPeople([]); return undefined; }
    const t = setTimeout(() => { api.pipCandidates(q.trim()).then((d) => setPeople(d.items)).catch(() => setPeople([])); }, 250);
    return () => clearTimeout(t);
  }, [q, draft]);

  const start = (s?: PipSuggestion) => { setErrors({}); setQ(''); setDraft({ ...blank(), employee: s ? { id: s.employee_id, name: s.employee_name } : null, sheetId: s?.sheet_id ?? null }); };
  const set = (patch: Partial<Draft>) => draft && setDraft({ ...draft, ...patch });
  const setObjective = (i: number, patch: Partial<Draft['objectives'][number]>) => draft && set({ objectives: draft.objectives.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  const save = async () => {
    if (!draft) return;
    setBusy(true); setErrors({});
    try {
      const made = await api.createPip({
        employee_id: draft.employee?.id, goal_sheet_id: draft.sheetId, title: draft.title, reason: draft.reason, start_date: draft.start, end_date: draft.end,
        items: draft.objectives.map((o) => ({ objective: o.objective, measure: o.measure, due_date: o.due || null })),
      });
      showSuccess('Plan created as a draft');
      setDraft(null);
      window.location.assign(`${basePath}/improvement-plans/${made.id}`);
    } catch (e) { setErrors({ ...errorsOf(e, 'title'), form: messageOf(e) }); } finally { setBusy(false); }
  };

  const term = search.trim().toLowerCase();
  const shown = items?.filter((p) => !term || `${p.title} ${p.employee_name}`.toLowerCase().includes(term));
  const href = (p: Pip) => `${basePath}/improvement-plans/${p.id}`;
  // Anyone may open their own list; starting a plan is for managers looking at their team, or HR.
  const canStart = manager || scope === 'team';

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title="Improvement plans" count={shown?.length} subtitle="Support plans with an outcome" help={HELP.pips}
        actions={<>
          <SearchBox value={search} onChange={setSearch} placeholder="Search plan or name…" />
          <SegmentedControl<Scope> options={[{ value: 'mine', label: 'My plan' }, { value: 'team', label: 'My team' }, ...(manager ? [{ value: 'all' as Scope, label: 'Everyone' }] : [])]} value={scope} onChange={setScope} fitText />
          <SegmentedControl<Show> options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} value={show} onChange={setShow} fitText />
          {canStart && <Btn icon={Plus} onClick={() => start()}>New plan</Btn>}
        </>} />
      {suggestions.length > 0 && (
        <div className="space-y-2 rounded-xl border border-line bg-surface p-3 sm:p-3.5">
          <p className="text-xs font-semibold text-fg sm:text-[13px]">Worth a conversation <span className="font-normal text-fg-muted">· released ratings in the bands your company flagged. A plan is only a suggestion until you start one.</span></p>
          <div className="divide-y divide-line/60">
            {suggestions.map((s) => (
              <div key={s.sheet_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <p className="text-sm text-fg">{s.employee_name}<span className="ml-2 text-[11px] text-fg-muted">{s.cycle_name} · rating {s.final_band}{s.overall_score !== null ? ` · score ${s.overall_score}` : ''}</span></p>
                <Btn variant="secondary" size="sm" onClick={() => start(s)}>Start a plan</Btn>
              </div>
            ))}
          </div>
        </div>
      )}
      <Panel>
        {error && <div className="border-b border-line p-3"><p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p></div>}
        {shown === undefined && <TableSkeleton rows={4} columns={5} />}
        {shown?.length === 0 && !error && (
          <div className="flex flex-1 flex-col items-center justify-center p-4">
            <EmptyState
              illustration={{ src: '/vectors/policy.svg', width: 220, height: 160, alt: '' }}
              title={term ? 'Nothing matches' : scope === 'mine' ? 'No improvement plan' : 'No plans here'}
              description={term ? 'Try another name.' : scope === 'mine' ? 'You have no improvement plan. Plans only show here once they start.' : 'An improvement plan sets clear objectives and check-ins for someone who needs support. Start one from a released rating or for anyone you manage.'}
              action={term ? { label: 'Clear search', onClick: () => setSearch('') } : canStart && show === 'open' ? { label: 'New plan', onClick: () => start() } : undefined}
            />
          </div>
        )}
        {shown && shown.length > 0 && (
          <>
            <div className="hidden min-h-0 flex-1 md:block">
              <Table minWidth={720} head={[{ label: 'Plan' }, { label: 'Employee', className: 'w-48' }, { label: 'Dates', className: 'w-56' }, { label: 'Status', className: 'w-36' }, { label: 'Actions', className: 'w-28 text-right' }]}>
                {shown.map((p) => (
                  <tr key={p.id} onClick={() => router.push(href(p))} className="cursor-pointer transition-colors hover:bg-bg-subtle/50">
                    <td className={td}><span className="font-semibold">{p.title}</span>{p.owner_name && <span className="mt-0.5 block text-[11px] text-fg-muted">Owner: {p.owner_name}</span>}</td>
                    <td className={td}>{p.employee_name}</td>
                    <td className={`${td} text-fg-muted`}>{p.start_date} to {p.end_date}</td>
                    <td className={td}><StatusPill label={p.outcome ? (p.outcome === 'passed' ? 'Passed' : 'Failed') : PIP_STATUS_LABEL[p.status]} tone={tone(p.status)} /></td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}><Link href={href(p)} className={btnClass('secondary', 'sm')}>Open</Link></td>
                  </tr>
                ))}
              </Table>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden md:hidden">
              {shown.map((p) => (
                <Link key={p.id} href={href(p)} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-bg-subtle/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">{p.title}</p>
                    <p className="truncate text-[11px] text-fg-muted">{p.employee_name} · {p.start_date} to {p.end_date}</p>
                  </div>
                  <StatusPill label={PIP_STATUS_LABEL[p.status]} tone={tone(p.status)} />
                </Link>
              ))}
            </div>
          </>
        )}
      </Panel>

      <Dialog open={Boolean(draft)} onClose={() => setDraft(null)} title="New improvement plan" maxWidthClassName="max-w-2xl"
        footer={<><Btn type="button" variant="secondary" onClick={() => setDraft(null)}>Cancel</Btn><Btn type="button" loading={busy} onClick={save}>Create draft</Btn></>}>
        {draft && (
          <div className="space-y-3">
            {draft.employee ? (
              <p className="text-sm text-fg">Employee: <span className="font-semibold">{draft.employee.name}</span> {!draft.sheetId && <button type="button" className="ml-2 text-xs underline" onClick={() => set({ employee: null })}>Change</button>}</p>
            ) : (
              <div className="relative">
                <TextField label="Employee" required value={q} onChange={setQ} placeholder="Search by name or code" prefix={<Search className="h-3.5 w-3.5" />} error={errors.employee_id} />
                {people.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-[var(--tt-shadow-sm)]">
                    {people.map((x) => <li key={x.id}><button type="button" onClick={() => { set({ employee: { id: x.id, name: x.name } }); setQ(''); setPeople([]); }} className="w-full px-3 py-2 text-left text-sm text-fg hover:bg-bg-subtle">{x.name}{x.employee_code && <span className="ml-2 text-[11px] text-fg-muted">{x.employee_code}</span>}</button></li>)}
                  </ul>
                )}
              </div>
            )}
            <TextField label="Title" required value={draft.title} onChange={(v) => set({ title: v })} error={errors.title} maxLength={150} />
            <Textarea label="Why" rows={3} value={draft.reason} onChange={(e) => set({ reason: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Starts" type="date" value={draft.start} onChange={(v) => set({ start: v })} error={errors.start_date} />
              <TextField label="Ends" type="date" value={draft.end} onChange={(v) => set({ end: v })} error={errors.end_date} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-fg sm:text-[13px]">Objectives</p>
              {draft.objectives.map((o, i) => (
                <div key={i} className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_1fr_9rem_auto]">
                  <TextField label="" aria-label="Objective" placeholder="What must change" value={o.objective} onChange={(v) => setObjective(i, { objective: v })} maxLength={300} />
                  <TextField label="" aria-label="Measure" placeholder="How success is judged" value={o.measure} onChange={(v) => setObjective(i, { measure: v })} />
                  <TextField label="" type="date" aria-label="Due" value={o.due} onChange={(v) => setObjective(i, { due: v })} />
                  <div className="pt-0.5"><IconBtn label="Remove objective" onClick={() => set({ objectives: draft.objectives.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></IconBtn></div>
                </div>
              ))}
              {errors.items && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.items}</p>}
              <Btn variant="secondary" size="sm" icon={Plus} onClick={() => set({ objectives: [...draft.objectives, { objective: '', measure: '', due: '' }] })}>Add objective</Btn>
            </div>
            {errors.form && !errors.title && !errors.items && !errors.start_date && !errors.end_date && !errors.employee_id && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.form}</p>}
          </div>
        )}
      </Dialog>
    </div>
  );
}
