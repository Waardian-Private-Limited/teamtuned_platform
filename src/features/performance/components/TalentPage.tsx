'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { Pencil, Plus, UserPlus, X } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Textarea } from '@/components/ui/Textarea';
import * as api from '../api/perf.api';
import type { Cycle, KeyPosition, NineBox, PersonOption, Potential, Readiness } from '../types/perf.types';
import { PersonPicker } from './PersonPicker';
import { Btn, IconBtn, PageHead, Panel, Table, td } from './ui';

type Tab = 'grid' | 'succession';
const LEVEL: Record<Potential, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const READINESS: Record<Readiness, string> = { ready_now: 'Ready now', one_two_years: 'In 1 to 2 years', three_plus: 'In 3 years or more' };

/** Talent view for HR: the nine-box grid of a cycle, and succession for key positions. Needs the talent permission. */
export function TalentPage({ basePath }: { basePath: string }) {
  const [tab, setTab] = React.useState<Tab>('grid');
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title="Talent" subtitle="Nine-box and succession" help={HELP.talent}
        actions={<SegmentedControl<Tab> options={[{ value: 'grid', label: 'Nine-box' }, { value: 'succession', label: 'Succession' }]} value={tab} onChange={setTab} fitText />} />
      {tab === 'grid' ? <NineBoxView basePath={basePath} /> : <SuccessionView />}
    </div>
  );
}

function NineBoxView({ basePath }: { basePath: string }) {
  const [cycles, setCycles] = React.useState<Cycle[] | null>(null);
  const [cycleId, setCycleId] = React.useState<number | null>(null);
  const [grid, setGrid] = React.useState<NineBox | null>(null);
  const [error, setError] = React.useState('');
  const [openBox, setOpenBox] = React.useState<NineBox['boxes'][number] | null>(null);

  React.useEffect(() => {
    api.listCycles('all', null).then((d) => {
      const usable = d.items.filter((c) => ['review', 'calibration', 'released', 'closed'].includes(c.status));
      setCycles(usable);
      if (usable.length) setCycleId(usable[0].id);
    }).catch((e) => setError(messageOf(e)));
  }, []);
  React.useEffect(() => { if (cycleId) { setGrid(null); api.nineBox(cycleId).then(setGrid).catch((e) => setError(messageOf(e))); } }, [cycleId]);

  // Potential runs bottom to top, performance left to right; box 9 sits top right.
  const rows: Potential[] = ['high', 'medium', 'low'];
  return (
    <Panel className="overflow-y-auto p-3 tt-scroll-hidden sm:p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="w-72">{cycles && cycles.length > 0 && <SelectField<number> label="Cycle" numeric value={cycleId} onChange={setCycleId} options={cycles.map((c) => ({ value: c.id, label: c.name }))} />}</div>
        {grid && <p className="text-xs text-fg-muted">{grid.total} people{grid.unplaced.length ? ` · ${grid.unplaced.length} not placed (no potential or no rating yet)` : ''}{grid.draft ? ' · draft: some ratings are not released yet' : ''}</p>}
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {cycles?.length === 0 && <EmptyState illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }} title="No cycle has reached review yet" description="Managers say how much potential each person has in the final review. The grid fills from then." />}
      {cycleId && !grid && !error && <div className="h-96 animate-pulse rounded-xl bg-bg-subtle" />}
      {grid && (
        <div className="grid grid-cols-[1.5rem_1fr] gap-2">
          <div className="flex items-center justify-center"><span className="-rotate-90 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Potential</span></div>
          <div className="space-y-2">
            {rows.map((pot) => (
              <div key={pot} className="grid grid-cols-[3.5rem_repeat(3,minmax(0,1fr))] gap-2">
                <div className="flex items-center text-[11px] font-semibold text-fg-muted">{LEVEL[pot]}</div>
                {grid.boxes.filter((b) => b.potential === pot).map((b) => (
                  <button key={b.box} type="button" onClick={() => setOpenBox(b)} title={b.hint}
                    className={`flex min-h-28 flex-col rounded-xl border p-3 text-left transition-colors hover:border-line-strong ${b.box === 9 ? 'border-[var(--tt-primary)] bg-bg-subtle' : b.box === 1 ? 'border-[var(--tt-danger)]/40' : 'border-line bg-surface'}`}>
                    <span className="flex items-baseline justify-between gap-2"><span className="text-xs font-bold text-fg">{b.name}</span><span className="text-xl font-extrabold text-fg">{b.people.length}</span></span>
                    <span className="mt-1 line-clamp-3 text-[11px] text-fg-muted">{b.people.slice(0, 4).map((p) => p.name).join(', ')}{b.people.length > 4 ? ` +${b.people.length - 4}` : ''}</span>
                  </button>
                ))}
              </div>
            ))}
            <div className="grid grid-cols-[3.5rem_repeat(3,minmax(0,1fr))] gap-2 text-center text-[11px] font-semibold text-fg-muted">
              <span />{(['low', 'medium', 'high'] as Potential[]).map((l) => <span key={l}>{LEVEL[l]}</span>)}
            </div>
            <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Performance (rating)</p>
          </div>
        </div>
      )}
      {openBox && (
        <Dialog open onClose={() => setOpenBox(null)} title={`${openBox.name} · ${openBox.people.length}`}>
          <div className="space-y-2">
            <p className="text-xs text-fg-muted">{openBox.hint}</p>
            {openBox.people.length === 0 && <p className="text-sm text-fg-muted">Nobody here.</p>}
            <ul className="divide-y divide-line/60">
              {openBox.people.map((p) => (
                <li key={p.sheet_id} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-sm text-fg"><span className="font-semibold">{p.name}</span><span className="ml-2 text-[11px] text-fg-muted">{p.band_label}{p.reviewer_name ? ` · ${p.reviewer_name}` : ''}{p.released ? '' : ' · not released'}</span></span>
                  <Link href={`${basePath}/sheets/${p.sheet_id}`} className="text-xs font-semibold text-fg underline-offset-4 hover:underline">Goal sheet</Link>
                </li>
              ))}
            </ul>
          </div>
        </Dialog>
      )}
    </Panel>
  );
}

function SuccessionView() {
  const [status, setStatus] = React.useState<'active' | 'archived'>('active');
  const [items, setItems] = React.useState<KeyPosition[] | null>(null);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<KeyPosition | 'new' | null>(null);
  const [adding, setAdding] = React.useState<KeyPosition | null>(null);
  const load = React.useCallback(() => { setError(''); api.keyPositions(status).then((d) => setItems(d.items)).catch((e) => setError(messageOf(e))); }, [status]);
  React.useEffect(() => { setItems(null); load(); }, [load]);

  const drop = async (p: KeyPosition, employeeId: number) => { try { setItems((await api.removeSuccessor(p.id, employeeId)).items); } catch (e) { setError(messageOf(e)); } };

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="text-xs text-fg-muted">Roles the company cannot leave empty, who holds them, and who could step in. A role with nobody ready now is marked.</p>
        <div className="flex items-center gap-2">
          <SegmentedControl<'active' | 'archived'> options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} value={status} onChange={setStatus} fitText />
          <Btn icon={Plus} onClick={() => setEditing('new')}>Add position</Btn>
        </div>
      </div>
      {error && <p role="alert" className="border-b border-line p-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {!items && !error && <div className="m-4 h-40 animate-pulse rounded-xl bg-bg-subtle" />}
      {items?.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <EmptyState illustration={{ src: '/vectors/employees.svg', width: 220, height: 160, alt: '' }} title="No key positions yet" description="Add the roles that would hurt most if they were empty, then name who could step in and when." action={status === 'active' ? { label: 'Add position', onClick: () => setEditing('new') } : undefined} />
        </div>
      )}
      {items && items.length > 0 && (
        <Table minWidth={900} head={[{ label: 'Position' }, { label: 'Held by', className: 'w-44' }, { label: 'Risk', className: 'w-36' }, { label: 'Ready now', className: 'w-28' }, { label: 'Successors' }, { label: 'Actions', className: 'w-24 text-right' }]}>
          {items.map((p) => (
            <tr key={p.id} className="align-top">
              <td className={td}><span className="font-semibold">{p.title}</span>{p.department_name && <span className="block text-[11px] text-fg-muted">{p.department_name}</span>}</td>
              <td className={`${td} text-fg-muted`}>{p.incumbent_name || 'Empty'}</td>
              <td className={`${td} text-[11px] text-fg-muted`}>Critical: {LEVEL[p.criticality]}<br />Could leave: {LEVEL[p.vacancy_risk]}</td>
              <td className={td}><span className={`font-semibold ${p.bench.ready_now === 0 ? 'text-[var(--tt-danger)]' : ''}`}>{p.bench.ready_now}</span><span className="text-[11px] text-fg-muted"> of {p.bench.total}</span></td>
              <td className={td}>
                <div className="flex flex-wrap gap-1.5">
                  {p.successors.map((s) => (
                    <span key={s.employee_id} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[11px] text-fg" title={s.notes || undefined}>
                      <span className="font-semibold">{s.name}</span><span className="text-fg-muted">· {READINESS[s.readiness]}{s.cell ? ` · ${s.cell.name}` : ''}</span>
                      <button type="button" aria-label={`Remove ${s.name}`} onClick={() => drop(p, s.employee_id)} className="rounded p-0.5 text-fg-muted hover:text-fg"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  {status === 'active' && <button type="button" onClick={() => setAdding(p)} className="inline-flex items-center gap-1 rounded-md border border-dashed border-line px-2 py-0.5 text-[11px] font-semibold text-fg-muted hover:text-fg"><UserPlus className="h-3 w-3" />Add</button>}
                </div>
              </td>
              <td className={`${td} text-right`}><IconBtn label="Edit position" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></IconBtn></td>
            </tr>
          ))}
        </Table>
      )}
      {editing && <PositionDialog position={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); showSuccess('Saved'); load(); }} />}
      {adding && <SuccessorDialog position={adding} onClose={() => setAdding(null)} onSaved={(list) => { setAdding(null); setItems(list); showSuccess('Successor added'); }} />}
    </Panel>
  );
}

function PositionDialog({ position, onClose, onSaved }: { position: KeyPosition | null; onClose: () => void; onSaved: () => void }) {
  const p = position;
  const [title, setTitle] = React.useState(p?.title || '');
  const [holder, setHolder] = React.useState<PersonOption | null>(p?.incumbent_employee_id ? { id: p.incumbent_employee_id, name: p.incumbent_name || '' } : null);
  const [criticality, setCriticality] = React.useState<Potential>(p?.criticality || 'medium');
  const [risk, setRisk] = React.useState<Potential>(p?.vacancy_risk || 'low');
  const [notes, setNotes] = React.useState(p?.notes || '');
  const [archived, setArchived] = React.useState(p?.status === 'archived');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const levels = (Object.keys(LEVEL) as Potential[]).map((l) => ({ value: l, label: LEVEL[l] }));
  const save = async () => {
    setBusy(true); setError('');
    const body = { title, incumbent_employee_id: holder?.id ?? null, criticality, vacancy_risk: risk, notes, status: archived ? 'archived' : 'active', department_id: p?.department_id ?? null, role_id: p?.role_id ?? null };
    try { if (p) await api.updateKeyPosition(p.id, body); else await api.createKeyPosition(body); onSaved(); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={p ? 'Edit position' : 'Add key position'} footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>Save</Btn></>}>
      <div className="space-y-3">
        <TextField label="Position" required value={title} onChange={setTitle} maxLength={150} placeholder="For example: Head of Sales, North" />
        <PersonPicker label="Held by (leave empty if vacant)" value={holder} onChange={setHolder} search={api.talentPeople} />
        <div className="grid grid-cols-2 gap-3">
          <SelectField<Potential> label="How critical" value={criticality} onChange={(v) => v && setCriticality(v)} options={levels} />
          <SelectField<Potential> label="Risk they leave" value={risk} onChange={(v) => v && setRisk(v)} options={levels} />
        </div>
        <Textarea label="Notes (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
        {p && <SegmentedControl<'a' | 'x'> options={[{ value: 'a', label: 'Active' }, { value: 'x', label: 'Archived' }]} value={archived ? 'x' : 'a'} onChange={(v) => setArchived(v === 'x')} fitText />}
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}

function SuccessorDialog({ position, onClose, onSaved }: { position: KeyPosition; onClose: () => void; onSaved: (list: KeyPosition[]) => void }) {
  const [person, setPerson] = React.useState<PersonOption | null>(null);
  const [readiness, setReadiness] = React.useState<Readiness>('one_two_years');
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const save = async () => {
    if (!person) { setError('Choose who could step in'); return; }
    setBusy(true); setError('');
    try { onSaved((await api.setSuccessor(position.id, person.id, { readiness, notes })).items); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={`Who could step into ${position.title}?`} footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>Add</Btn></>}>
      <div className="space-y-3">
        <PersonPicker label="Person" value={person} onChange={setPerson} search={api.talentPeople} />
        <SelectField<Readiness> label="Ready" value={readiness} onChange={(v) => v && setReadiness(v)} options={(Object.keys(READINESS) as Readiness[]).map((r) => ({ value: r, label: READINESS[r] }))} />
        <TextField label="What they need first (optional)" value={notes} onChange={setNotes} maxLength={500} placeholder="For example: a year running a team" />
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}
