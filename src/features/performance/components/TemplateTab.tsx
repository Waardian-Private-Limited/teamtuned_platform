'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import * as api from '../api/perf.api';
import { GOAL_MODE_LABEL, SECTION_LABEL } from '../constants/perf.constants';
import { useResource } from '../hooks/useResource';
import type { Competency, GoalMode, Kpi, Scale, Section, Template } from '../types/perf.types';
import { FormFooter, ListShell, num, numText } from './parts';
import { Btn } from './ui';

interface ItemDraft { type: 'kpi' | 'competency'; refId: number | null; weight: string; target: string }
interface Draft {
  id: number | null; name: string; description: string; scaleId: number | null; goalMode: GoalMode; minGoals: string; maxGoals: string; allowCustom: boolean;
  weights: Record<Section, string>; items: ItemDraft[]; subOrgId: number | null;
}

const blank = (subOrgId: number | null): Draft => ({
  id: null, name: '', description: '', scaleId: null, goalMode: 'manager_sets', minGoals: '', maxGoals: '', allowCustom: false,
  weights: { kpi: '100', competency: '', feedback: '' }, items: [], subOrgId,
});

const total = (items: ItemDraft[]) => Math.round(items.reduce((s, i) => s + (num(i.weight) || 0), 0) * 100) / 100;

function body(d: Draft) {
  return {
    name: d.name, description: d.description, rating_scale_id: d.scaleId, goal_mode: d.goalMode, min_goals: num(d.minGoals), max_goals: num(d.maxGoals), allow_custom_goals: d.allowCustom,
    section_weights: { kpi: num(d.weights.kpi), competency: num(d.weights.competency), feedback: num(d.weights.feedback) },
    items: d.items.map((i) => (i.type === 'kpi'
      ? { item_type: 'kpi', kpi_id: i.refId, weight: num(i.weight), target: num(i.target) }
      : { item_type: 'competency', competency_id: i.refId, weight: num(i.weight) })),
    ...(d.id ? {} : { sub_organization_id: d.subOrgId }),
  };
}

export function TemplateTab({ subOrgId, canEdit, isOrgAdmin }: { subOrgId: number | null; canEdit: boolean; isOrgAdmin: boolean }) {
  const r = useResource<Template>('templates', subOrgId);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [lists, setLists] = React.useState<{ kpis: Kpi[]; competencies: Competency[]; scales: Scale[] } | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!draft || lists) return;
    Promise.all([api.list<Kpi>('kpis', 'active', null), api.list<Competency>('competencies', 'active', null), api.list<Scale>('scales', 'active', null)])
      .then(([k, c, s]) => setLists({ kpis: k.items, competencies: c.items, scales: s.items }))
      .catch((e) => setError(messageOf(e)));
  }, [draft, lists]);

  const open = async (t: Template) => {
    setError('');
    try {
      const full = await api.getTemplate(t.id);
      setDraft({
        id: full.id, name: full.name, description: full.description || '', scaleId: full.rating_scale_id, goalMode: full.goal_mode, minGoals: numText(full.min_goals), maxGoals: numText(full.max_goals),
        allowCustom: full.allow_custom_goals, subOrgId: full.sub_organization_id,
        weights: { kpi: numText(full.section_weights.kpi), competency: numText(full.section_weights.competency), feedback: numText(full.section_weights.feedback) },
        items: (full.items || []).map((i) => ({ type: i.item_type, refId: i.item_type === 'kpi' ? i.kpi_id : i.competency_id, weight: numText(i.weight), target: numText(i.target) })),
      });
    } catch (e) { setError(messageOf(e)); }
  };

  const close = () => { r.clearErrors(); setDraft(null); };
  const save = async () => { if (draft && (await r.save(draft.id, body(draft)))) setDraft(null); };
  const set = (patch: Partial<Draft>) => draft && setDraft({ ...draft, ...patch });
  const setItem = (idx: number, patch: Partial<ItemDraft>) => draft && set({ items: draft.items.map((i, j) => (j === idx ? { ...i, ...patch } : i)) });
  /** Gives every item of one section the same weight, adding up to exactly 100. */
  const spread = (type: ItemDraft['type']) => {
    if (!draft) return;
    const n = draft.items.filter((i) => i.type === type).length;
    if (!n) return;
    const each = Math.floor(10000 / n) / 100;
    let seen = 0;
    set({ items: draft.items.map((i) => { if (i.type !== type) return i; seen += 1; return { ...i, weight: String(seen === n ? Math.round((100 - each * (n - 1)) * 100) / 100 : each) }; }) });
  };

  const e = r.errors;
  const section = (type: 'kpi' | 'competency') => {
    if (!draft) return null;
    const rows = draft.items.map((it, idx) => ({ it, idx })).filter((x) => x.it.type === type);
    const pool = type === 'kpi' ? (lists?.kpis || []) : (lists?.competencies || []);
    const sum = total(rows.map((x) => x.it));
    return (
      <div className="space-y-2 rounded-lg border border-line p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-fg sm:text-[13px]">{SECTION_LABEL[type]} <span className={sum === 100 || !rows.length ? 'font-normal text-fg-muted' : 'font-normal text-[var(--tt-danger)]'}>· weights total {sum} of 100</span></p>
          <div className="flex gap-2">
            <Btn type="button" variant="secondary" size="sm" onClick={() => spread(type)} disabled={!rows.length}>Spread evenly</Btn>
            <Btn type="button" variant="secondary" size="sm" onClick={() => set({ items: [...draft.items, { type, refId: null, weight: '', target: '' }] })}><Plus className="h-3.5 w-3.5" /> Add</Btn>
          </div>
        </div>
        {rows.map(({ it, idx }) => (
          <div key={idx} className={`grid items-start gap-2 ${type === 'kpi' ? 'grid-cols-[1fr_5rem_6rem_auto]' : 'grid-cols-[1fr_5rem_auto]'}`}>
            <SelectField<number> label={type === 'kpi' ? 'KPI' : 'Competency'} numeric value={it.refId} onChange={(v) => setItem(idx, { refId: v })} options={pool.map((p) => ({ value: p.id, label: p.name }))} />
            <TextField label="Weight" type="number" value={it.weight} onChange={(v) => setItem(idx, { weight: v })} />
            {type === 'kpi' && <TextField label="Target" type="number" value={it.target} onChange={(v) => setItem(idx, { target: v })} />}
            <button type="button" aria-label="Remove" onClick={() => set({ items: draft.items.filter((_, j) => j !== idx) })} className="mt-7 rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {!rows.length && <p className="text-xs text-fg-muted">None added.</p>}
      </div>
    );
  };

  const weightSum = draft ? Math.round((['kpi', 'competency', 'feedback'] as Section[]).reduce((s, k) => s + (num(draft.weights[k]) || 0), 0) * 100) / 100 : 0;

  return (
    <>
      {error && <p role="alert" className="mb-2 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      <ListShell<Template>
        title="Templates" noun="template" intro="Goal-sheet blueprints: KPIs, competencies and weights."
        items={r.items} loadError={r.loadError} status={r.status} onStatus={r.setStatus} canEdit={canEdit}
        onAdd={() => setDraft(blank(subOrgId))} onEdit={open} onArchive={r.archive}
        row={(t) => ({ name: t.name, detail: [`${t.item_count ?? 0} items`, Object.entries(t.section_weights).map(([k, v]) => `${SECTION_LABEL[k as Section]} ${v}%`).join(' · '), GOAL_MODE_LABEL[t.goal_mode]].join(' · ') })}
      />
      <Dialog open={Boolean(draft)} onClose={close} title={draft?.id ? 'Edit template' : 'Add template'} maxWidthClassName="max-w-3xl" footer={<FormFooter onCancel={close} onSave={save} saving={r.saving} />}>
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="Name" required value={draft.name} onChange={(v) => set({ name: v })} error={e.name} maxLength={150} autoFocus />
              <SelectField<number> label="Rating scale" numeric value={draft.scaleId} onChange={(v) => set({ scaleId: v })} placeholder="Company default" options={(lists?.scales || []).map((s) => ({ value: s.id, label: s.name }))} error={e.rating_scale_id} />
            </div>
            <Textarea label="Description" rows={2} value={draft.description} onChange={(ev) => set({ description: ev.target.value })} />

            <div className="space-y-2 rounded-lg border border-line p-3">
              <p className="text-xs font-semibold text-fg sm:text-[13px]">How the final score is made up <span className={weightSum === 100 ? 'font-normal text-fg-muted' : 'font-normal text-[var(--tt-danger)]'}>· total {weightSum} of 100</span></p>
              <div className="grid grid-cols-3 gap-3">
                {(['kpi', 'competency', 'feedback'] as Section[]).map((k) => (
                  <TextField key={k} label={`${SECTION_LABEL[k]} %`} type="number" value={draft.weights[k]} onChange={(v) => set({ weights: { ...draft.weights, [k]: v } })} />
                ))}
              </div>
              {e.section_weights && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{e.section_weights}</p>}
            </div>

            {section('kpi')}
            {section('competency')}
            {e.items && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{e.items}</p>}

            <div className="space-y-3 rounded-lg border border-line p-3">
              <p className="text-xs font-semibold text-fg sm:text-[13px]">Goal setting</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SelectField<GoalMode> label="Who sets goals" value={draft.goalMode} onChange={(v) => v && set({ goalMode: v })} options={(Object.keys(GOAL_MODE_LABEL) as GoalMode[]).map((v) => ({ value: v, label: GOAL_MODE_LABEL[v] }))} />
                <TextField label="Fewest goals" type="number" value={draft.minGoals} onChange={(v) => set({ minGoals: v })} error={e.min_goals} />
                <TextField label="Most goals" type="number" value={draft.maxGoals} onChange={(v) => set({ maxGoals: v })} error={e.max_goals} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-fg">Allow goals that are not in the template</span>
                <Switch checked={draft.allowCustom} onChange={(v) => set({ allowCustom: v })} label="Allow custom goals" />
              </div>
            </div>
            {!draft.id && <SubOrgPicker value={draft.subOrgId} onChange={(v) => set({ subOrgId: v })} allowShared={isOrgAdmin} />}
          </div>
        )}
      </Dialog>
    </>
  );
}
