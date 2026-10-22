'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import { ChevronRight, MessageSquarePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { orgToday, useOrgTimezone } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Textarea } from '@/components/ui/Textarea';
import * as api from '../api/perf.api';
import { errorsOf, type FieldErrors } from '../hooks/useResource';
import { fmt } from '../lib';
import type { Confidence, GoalOption, KeyResult, KrKind, KrSource, Objective, OkrLevel, OkrStatus, OkrTree, PersonOption } from '../types/perf.types';
import { PersonPicker } from './PersonPicker';
import { Btn, IconBtn, PageHead, Panel, Progress } from './ui';

type View = 'all' | 'company' | 'mine';
const LEVEL_LABEL: Record<OkrLevel, string> = { company: 'Company', department: 'Department', person: 'Person' };
const STATUS_LABEL: Record<OkrStatus, string> = { draft: 'Draft', active: 'Active', done: 'Done', dropped: 'Dropped' };
const CONFIDENCE_LABEL: Record<Confidence, string> = { on_track: 'On track', at_risk: 'At risk', off_track: 'Off track' };
const KIND_LABEL: Record<KrKind, string> = { number: 'Number', percent: 'Percent', yes_no: 'Yes or no' };
const SOURCE_LABEL: Record<KrSource, string> = { manual: 'Updated by hand', goal_item: 'From a goal-sheet KPI', children: 'Average of aligned objectives' };

const pct = (p: number | null) => (p === null ? '—' : `${fmt(p)}%`);

/** Objectives and key results from the company down to each person, as a tree. Progress only: ratings never read OKRs. */
export function OkrPage() {
  const tz = useOrgTimezone();
  const [on, setOn] = React.useState(orgToday(tz));
  const [view, setView] = React.useState<View>('all');
  const [tree, setTree] = React.useState<OkrTree | null>(null);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<Objective | 'new' | null>(null);
  const [checking, setChecking] = React.useState<{ o: Objective; kr: KeyResult } | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [open, setOpen] = React.useState<Set<number>>(new Set());

  const load = React.useCallback(() => { setError(''); api.okrTree(on).then((t) => { setTree(t); setOpen(new Set(t.items.map((o) => o.id))); }).catch((e) => setError(messageOf(e))); }, [on]);
  React.useEffect(() => { setTree(null); load(); }, [load]);

  const items = tree?.items || [];
  const ids = new Set(items.map((o) => o.id));
  const shown = items.filter((o) => (view === 'company' ? o.level !== 'person' : view === 'mine' ? o.owner_employee_id === tree?.me : true));
  const shownIds = new Set(shown.map((o) => o.id));
  // An objective whose parent is hidden (other dates, not visible, filtered out) starts its own branch.
  const roots = shown.filter((o) => !o.parent_objective_id || !ids.has(o.parent_objective_id) || !shownIds.has(o.parent_objective_id));
  const kids = (id: number) => shown.filter((o) => o.parent_objective_id === id);

  const toggle = (id: number) => { const n = new Set(open); if (n.has(id)) n.delete(id); else n.add(id); setOpen(n); };
  const node = (o: Objective, depth: number): React.ReactNode => {
    const children = kids(o.id);
    return (
      <div key={o.id} className={depth ? 'border-l border-line pl-3 sm:pl-5' : ''}>
        <article className="space-y-3 rounded-xl border border-line bg-surface p-3 shadow-[var(--tt-shadow-sm)] sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              {children.length > 0 && <button type="button" aria-label={open.has(o.id) ? 'Collapse' : 'Expand'} onClick={() => toggle(o.id)} className="mt-0.5 rounded p-0.5 text-fg-muted hover:bg-bg-subtle"><ChevronRight className={`h-4 w-4 transition-transform ${open.has(o.id) ? 'rotate-90' : ''}`} /></button>}
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-fg">
                  <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">{LEVEL_LABEL[o.level]}</span>
                  {o.title}
                  {o.status !== 'active' && <span className="text-[11px] font-normal text-fg-muted">· {STATUS_LABEL[o.status]}</span>}
                </p>
                <p className="mt-0.5 text-[11px] text-fg-muted">{[o.owner_name, o.department_name, `${o.period_start} to ${o.period_end}`].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-lg font-extrabold text-fg">{pct(o.progress)}</span>
              {o.can_edit && <IconBtn label="Edit" onClick={() => setEditing(o)}><Pencil className="h-4 w-4" /></IconBtn>}
              {o.can_edit && <IconBtn label="Remove" onClick={() => setConfirm({ title: `Remove "${o.title}"?`, body: <p className="text-sm text-fg">Its key results and check-ins go too. Objectives aligned under it stay, at the top level.</p>, cta: 'Remove', danger: true, run: async () => { try { await api.removeObjective(o.id); showSuccess('Removed'); load(); } catch (e) { setError(messageOf(e)); } } })}><Trash2 className="h-4 w-4" /></IconBtn>}
            </div>
          </div>
          <Progress value={o.progress ?? 0} total={100} />
          <ul className="divide-y divide-line/60 rounded-lg border border-line">
            {o.key_results.map((k) => (
              <li key={k.id} className="grid grid-cols-1 items-center gap-2 px-3 py-2 sm:grid-cols-[1fr_9rem_6rem_auto]">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-fg sm:text-sm">{k.title}</p>
                  <p className="text-[11px] text-fg-muted">{SOURCE_LABEL[k.source]}{k.source !== 'children' ? ` · ${k.kind === 'yes_no' ? (k.current_value ? 'Yes' : k.current_value === 0 ? 'No' : 'Not answered') : `${fmt(k.current_value)} of ${fmt(k.target_value)}${k.start_value ? ` (from ${fmt(k.start_value)})` : ''}`}` : ''}{k.weight !== 1 ? ` · weight ${fmt(k.weight)}` : ''}</p>
                </div>
                <Progress value={k.progress ?? 0} total={100} />
                <span className="text-xs font-semibold text-fg">{pct(k.progress)}{k.confidence && <span className={`block text-[10px] font-semibold ${k.confidence === 'on_track' ? 'text-fg-muted' : 'text-[var(--tt-danger)]'}`}>{CONFIDENCE_LABEL[k.confidence]}</span>}</span>
                {o.can_edit ? <Btn variant="secondary" size="sm" icon={MessageSquarePlus} onClick={() => setChecking({ o, kr: k })}>Check in</Btn> : <span />}
              </li>
            ))}
          </ul>
        </article>
        {children.length > 0 && open.has(o.id) && <div className="mt-2 space-y-2">{children.map((c) => node(c, depth + 1))}</div>}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title="OKRs" count={shown.length} subtitle="Company to person, progress only" help={HELP.okrs}
        actions={<>
          <SegmentedControl<View> options={[{ value: 'all', label: 'Everything' }, { value: 'company', label: 'Company' }, { value: 'mine', label: 'Mine' }]} value={view} onChange={setView} fitText />
          <div className="w-40"><TextField label="" type="date" aria-label="Running on" value={on} onChange={(v) => v && setOn(v)} /></div>
          {(tree?.permissions.can_add_own || tree?.permissions.can_manage) && <Btn icon={Plus} onClick={() => setEditing('new')}>New objective</Btn>}
        </>} />
      <Panel className="overflow-y-auto p-3 tt-scroll-hidden sm:p-4">
        {error && <p role="alert" className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
        {!tree && !error && <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-bg-subtle" />)}</div>}
        {tree && shown.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <EmptyState illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }} title="No objectives running on this day"
              description={tree.permissions.can_manage ? 'Start with one company objective, for example "Grow revenue 25%", then let departments and people align their own under it.' : 'Add your own objective and align it to what your department is working towards.'}
              action={tree.permissions.can_add_own || tree.permissions.can_manage ? { label: 'New objective', onClick: () => setEditing('new') } : undefined} />
          </div>
        )}
        <div className="space-y-3">{roots.map((o) => node(o, 0))}</div>
      </Panel>
      {editing && tree && <ObjectiveDialog tree={tree} objective={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); showSuccess('Saved'); load(); }} />}
      {checking && <CheckinDialog o={checking.o} kr={checking.kr} onClose={() => setChecking(null)} onSaved={() => { setChecking(null); showSuccess('Progress updated'); load(); }} />}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

interface KrDraft { id?: number; title: string; kind: KrKind; start_value: string; target_value: string; weight: string; source: KrSource; goal_item_id: number | null }
const blankKr = (): KrDraft => ({ title: '', kind: 'number', start_value: '0', target_value: '', weight: '1', source: 'manual', goal_item_id: null });

function ObjectiveDialog({ tree, objective, onClose, onSaved }: { tree: OkrTree; objective: Objective | null; onClose: () => void; onSaved: () => void }) {
  const o = objective;
  const [level, setLevel] = React.useState<OkrLevel>(o?.level || (tree.permissions.can_manage ? 'company' : 'person'));
  const [title, setTitle] = React.useState(o?.title || '');
  const [description, setDescription] = React.useState(o?.description || '');
  const [start, setStart] = React.useState(o?.period_start || '');
  const [end, setEnd] = React.useState(o?.period_end || '');
  const [status, setStatus] = React.useState<OkrStatus>(o?.status || 'active');
  const [department, setDepartment] = React.useState<number | null>(o?.department_id ?? null);
  const [owner, setOwner] = React.useState<PersonOption | null>(o?.owner_employee_id ? { id: o.owner_employee_id, name: o.owner_name || '' } : null);
  const [parent, setParent] = React.useState<number | null>(o?.parent_objective_id ?? null);
  const [parentKr, setParentKr] = React.useState<number | null>(o?.parent_key_result_id ?? null);
  const [krs, setKrs] = React.useState<KrDraft[]>(o ? o.key_results.map((k) => ({ id: k.id, title: k.title, kind: k.kind, start_value: String(k.start_value), target_value: String(k.target_value), weight: String(k.weight), source: k.source, goal_item_id: k.goal_item_id })) : [blankKr()]);
  const [goals, setGoals] = React.useState<GoalOption[]>([]);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [busy, setBusy] = React.useState(false);

  const ownerId = level === 'person' ? owner?.id ?? tree.me : null;
  React.useEffect(() => { if (level === 'person') api.okrGoalOptions(ownerId).then((d) => setGoals(d.items)).catch(() => setGoals([])); }, [level, ownerId]);
  const parents = tree.items.filter((x) => x.id !== o?.id);
  const parentObj = parents.find((x) => x.id === parent);
  const setKr = (i: number, patch: Partial<KrDraft>) => setKrs(krs.map((k, j) => (j === i ? { ...k, ...patch } : k)));
  const levels = (tree.permissions.can_manage ? ['company', 'department', 'person'] : ['person']) as OkrLevel[];

  const save = async () => {
    setBusy(true); setErrors({});
    const body = {
      level, title, description, period_start: start, period_end: end, status, department_id: level === 'department' ? department : null,
      owner_employee_id: level === 'person' ? ownerId : null, parent_objective_id: parent, parent_key_result_id: parent ? parentKr : null,
      key_results: krs.map((k) => ({ id: k.id, title: k.title, kind: k.kind, start_value: k.start_value === '' ? 0 : Number(k.start_value), target_value: k.target_value === '' ? null : Number(k.target_value), weight: Number(k.weight) || 1, source: k.source, goal_item_id: k.goal_item_id })),
    };
    try { if (o) await api.updateObjective(o.id, body); else await api.createObjective(body); onSaved(); } catch (e) { setErrors({ ...errorsOf(e, 'form') }); } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} title={o ? 'Edit objective' : 'New objective'} maxWidthClassName="max-w-3xl" footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>Save</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SelectField<OkrLevel> label="Level" value={level} onChange={(v) => v && setLevel(v)} options={levels.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} disabled={Boolean(o)} />
          {level === 'department' && <SelectField<number> label="Department" numeric required value={department} onChange={setDepartment} options={tree.departments.map((d) => ({ value: d.id, label: d.name }))} error={errors.department_id} />}
          {level === 'person' && <div className="sm:col-span-2"><PersonPicker label="Whose objective (empty = yours)" value={owner} onChange={setOwner} search={api.oneOnOnePeople} listOnFocus placeholder="You, or someone who reports to you" error={errors.owner_employee_id} /></div>}
        </div>
        <TextField label="Objective" required value={title} onChange={setTitle} maxLength={200} placeholder="Where you want to get, in a few words" error={errors.title} />
        <Textarea label="Why it matters (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField label="From" type="date" required value={start} onChange={setStart} error={errors.period_start} />
          <TextField label="To" type="date" required value={end} onChange={setEnd} error={errors.period_end} />
          <SelectField<OkrStatus> label="Status" value={status} onChange={(v) => v && setStatus(v)} options={(Object.keys(STATUS_LABEL) as OkrStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField<number> label="Supports (optional)" numeric value={parent} placeholder="Nothing above it" onChange={(v) => { setParent(v); setParentKr(null); }} options={parents.map((x) => ({ value: x.id, label: `${LEVEL_LABEL[x.level]}: ${x.title}` }))} error={errors.parent_objective_id} />
          {parentObj && <SelectField<number> label="Counts towards" numeric value={parentKr} placeholder="The objective as a whole" onChange={setParentKr} options={parentObj.key_results.filter((k) => k.source === 'children').map((k) => ({ value: k.id, label: k.title }))} hint="Only key results that average aligned objectives are listed." error={errors.parent_key_result_id} />}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-fg sm:text-[13px]">Key results <span className="font-normal text-fg-muted">· how you will know you got there</span></p>
          {krs.map((k, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-line p-3">
              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_9rem_auto]">
                <TextField label="" aria-label="Key result" placeholder="For example: revenue of 120 lakh" value={k.title} onChange={(v) => setKr(i, { title: v })} maxLength={200} />
                <SelectField<KrSource> label="" value={k.source} onChange={(v) => v && setKr(i, { source: v })} options={(Object.keys(SOURCE_LABEL) as KrSource[]).filter((s) => s !== 'goal_item' || level === 'person').map((s) => ({ value: s, label: SOURCE_LABEL[s] }))} />
                <div className="pt-0.5"><IconBtn label="Remove key result" disabled={krs.length <= 1} onClick={() => setKrs(krs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></IconBtn></div>
              </div>
              {k.source === 'goal_item' && <SelectField<number> label="" numeric value={k.goal_item_id} placeholder={goals.length ? 'Choose a KPI' : 'No approved goal sheet with KPIs'} onChange={(v) => { const g = goals.find((x) => x.id === v); setKr(i, { goal_item_id: v, target_value: g?.target !== null && g?.target !== undefined && k.target_value === '' ? String(g.target) : k.target_value }); }} options={goals.map((g) => ({ value: g.id, label: `${g.name} · ${g.cycle_name}` }))} />}
              {k.source !== 'children' && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <SelectField<KrKind> label="Kind" value={k.kind} onChange={(v) => v && setKr(i, { kind: v })} options={(Object.keys(KIND_LABEL) as KrKind[]).map((x) => ({ value: x, label: KIND_LABEL[x] }))} />
                  {k.kind !== 'yes_no' && <TextField label="Start" type="number" value={k.start_value} onChange={(v) => setKr(i, { start_value: v })} />}
                  {k.kind !== 'yes_no' && <TextField label="Target" type="number" value={k.target_value} onChange={(v) => setKr(i, { target_value: v })} />}
                  <TextField label="Weight" type="number" value={k.weight} onChange={(v) => setKr(i, { weight: v })} />
                </div>
              )}
            </div>
          ))}
          {errors.key_results && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.key_results}</p>}
          {krs.length < 10 && <Btn variant="secondary" size="sm" icon={Plus} onClick={() => setKrs([...krs, blankKr()])}>Add key result</Btn>}
        </div>
        {errors.form && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.form}</p>}
      </div>
    </Dialog>
  );
}

function CheckinDialog({ o, kr, onClose, onSaved }: { o: Objective; kr: KeyResult; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = React.useState(kr.current_value === null ? '' : String(kr.current_value));
  const [confidence, setConfidence] = React.useState<Confidence | null>(kr.confidence);
  const [note, setNote] = React.useState('');
  const [history, setHistory] = React.useState<{ id: number; value: number | null; confidence: Confidence | null; note: string | null; by_name: string | null }[]>([]);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { api.krHistory(kr.id).then((d) => setHistory(d.items)).catch(() => setHistory([])); }, [kr.id]);
  const manual = kr.source === 'manual';
  const save = async () => {
    setBusy(true); setError('');
    try { await api.krCheckin(kr.id, { value: manual && value !== '' ? Number(value) : null, confidence, note }); onSaved(); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={`Check in: ${kr.title}`} footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>Save</Btn></>}>
      <div className="space-y-3">
        <p className="text-xs text-fg-muted">{o.title}</p>
        {manual
          ? kr.kind === 'yes_no'
            ? <SelectField<string> label="Done?" value={value === '' ? null : value} placeholder="Not answered" onChange={(v) => setValue(v ?? '')} options={[{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }]} />
            : <TextField label={`Value now (target ${fmt(kr.target_value)})`} type="number" value={value} onChange={setValue} />
          : <p className="rounded-lg bg-bg-subtle p-2 text-xs text-fg-muted">{SOURCE_LABEL[kr.source]}: it updates itself. Say how confident you are, and why.</p>}
        <SelectField<Confidence> label="How confident are you?" value={confidence} placeholder="Not said" onChange={setConfidence} options={(Object.keys(CONFIDENCE_LABEL) as Confidence[]).map((c) => ({ value: c, label: CONFIDENCE_LABEL[c] }))} />
        <Textarea label="Note (optional)" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
        {history.length > 0 && (
          <div className="space-y-1 border-t border-line/60 pt-2">
            <p className="text-[11px] font-semibold text-fg-muted">Earlier</p>
            {history.slice(0, 6).map((h) => <p key={h.id} className="text-[11px] text-fg"><span className="font-semibold">{h.by_name || 'Someone'}:</span> {[h.value !== null ? fmt(h.value) : null, h.confidence ? CONFIDENCE_LABEL[h.confidence] : null, h.note].filter(Boolean).join(' · ')}</p>)}
          </div>
        )}
      </div>
    </Dialog>
  );
}
