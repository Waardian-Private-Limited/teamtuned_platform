'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, SelectField, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import * as api from '../api/perf.api';
import { AGGREGATION_LABEL, DIRECTION_LABEL, ENTRY_LABEL, measureLabel, SCORING_LABEL, SOURCE_LABEL, TASK_PRIORITY_LABEL, UNIT_LABEL } from '../constants/perf.constants';
import { useResource } from '../hooks/useResource';
import type { Aggregation, Direction, EntryBy, Kpi, Kra, Meta, MetricOption, ScoringMethod, Source, Unit } from '../types/perf.types';
import { FormFooter, ListShell, num, numText } from './parts';
import { Btn } from './ui';

interface Draft {
  id: number | null; name: string; description: string; kraId: number | null; unit: Unit; direction: Direction; aggregation: Aggregation;
  source: Source; measure: string; metric: string; expression: string; refs: Record<string, number | null>;
  formId: number | null; priorities: string[]; labels: string; linkedOnly: boolean;
  method: ScoringMethod; cap: string; threshold: string; min: string; max: string; slabBasis: 'achievement' | 'actual'; slabs: { from: string; to: string; score: string }[];
  target: string; entryBy: EntryBy; evidence: boolean; subOrgId: number | null;
}

const blank = (subOrgId: number | null): Draft => ({
  id: null, name: '', description: '', kraId: null, unit: 'number', direction: 'higher_better', aggregation: 'sum', source: 'manual', measure: '', metric: '', expression: '', refs: {}, formId: null, priorities: [], labels: '', linkedOnly: false,
  method: 'linear', cap: '', threshold: '', min: '', max: '', slabBasis: 'achievement', slabs: [{ from: '0', to: '50', score: '0' }, { from: '50', to: '', score: '100' }],
  target: '', entryBy: 'manager', evidence: false, subOrgId,
});

const draftOf = (k: Kpi): Draft => ({
  ...blank(k.sub_organization_id),
  id: k.id, name: k.name, description: k.description || '', kraId: k.kra_id, unit: k.unit, direction: k.direction, aggregation: k.aggregation, source: k.source,
  measure: k.source_config.measure || (k.source === 'data_collection' ? 'field_value' : ''), metric: k.source_config.field_key ? `${k.source_config.form_id}:${k.source_config.field_key}` : '',
  formId: k.source_config.form_id ?? null, priorities: k.source_config.priorities || [], labels: (k.source_config.labels || []).join(', '), linkedOnly: Boolean(k.source_config.linked_only),
  expression: k.source_config.expression || '', refs: k.source_config.refs || {},
  method: k.scoring_method, cap: numText(k.scoring_config.cap), threshold: numText(k.scoring_config.threshold), min: numText(k.scoring_config.min), max: numText(k.scoring_config.max),
  slabBasis: k.scoring_config.basis || 'achievement',
  slabs: k.scoring_config.slabs?.length ? k.scoring_config.slabs.map((s) => ({ from: numText(s.from), to: numText(s.to), score: numText(s.score) })) : blank(null).slabs,
  target: numText(k.default_target), entryBy: k.entry_by, evidence: k.evidence_required,
});

/** Names used in a formula, in order of first use. */
const formulaNames = (expression: string) => [...new Set(expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [])];

function body(d: Draft) {
  let source_config: Record<string, unknown> = {};
  if (d.source === 'data_collection') {
    if (d.measure === 'field_value') {
      const [form, ...key] = d.metric.split(':');
      source_config = form ? { measure: d.measure, form_id: Number(form), field_key: key.join(':') } : { measure: d.measure };
    } else source_config = { measure: d.measure, form_id: d.formId };
  } else if (d.source === 'tasks') {
    source_config = { measure: d.measure, priorities: d.priorities, labels: d.labels.split(',').map((x) => x.trim()).filter(Boolean), form_id: d.formId, linked_only: d.linkedOnly };
  } else if (d.source === 'formula') source_config = { expression: d.expression, refs: Object.fromEntries(formulaNames(d.expression).map((n) => [n, d.refs[n] ?? null])) };
  else if (d.source in MEASURE_SOURCES) source_config = { measure: d.measure };

  let scoring_config: Record<string, unknown> = {};
  if (d.method === 'linear') scoring_config = { cap: num(d.cap) ?? undefined };
  if (d.method === 'threshold') scoring_config = { threshold: num(d.threshold), cap: num(d.cap) ?? undefined };
  if (d.method === 'range') scoring_config = { min: num(d.min), max: num(d.max) };
  if (d.method === 'slab') scoring_config = { basis: d.slabBasis, slabs: d.slabs.map((s) => ({ from: num(s.from), to: num(s.to), score: num(s.score) })) };

  return {
    name: d.name, description: d.description, kra_id: d.kraId, unit: d.unit, direction: d.direction, aggregation: d.aggregation, source: d.source, source_config,
    scoring_method: d.method, scoring_config, default_target: num(d.target), entry_by: d.entryBy, evidence_required: d.evidence,
    ...(d.id ? {} : { sub_organization_id: d.subOrgId }),
  };
}

const MEASURE_SOURCES: Record<string, true> = { tasks: true, attendance: true, leave: true, recruitment: true, data_collection: true };
const opts = <T extends string>(list: T[], labels: Record<T, string>) => list.map((v) => ({ value: v, label: labels[v] }));

export function KpiTab({ subOrgId, canEdit, isOrgAdmin }: { subOrgId: number | null; canEdit: boolean; isOrgAdmin: boolean }) {
  const r = useResource<Kpi>('kpis', subOrgId);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [meta, setMeta] = React.useState<Meta | null>(null);
  const [kras, setKras] = React.useState<Kra[]>([]);
  const [allKpis, setAllKpis] = React.useState<Kpi[]>([]);
  const [metrics, setMetrics] = React.useState<MetricOption[]>([]);
  const [forms, setForms] = React.useState<{ id: number; name: string }[]>([]);
  const [optionError, setOptionError] = React.useState('');

  // Lists the form needs are loaded when it first opens.
  React.useEffect(() => {
    if (!draft || meta) return;
    Promise.all([api.getMeta(), api.list<Kra>('kras', 'active', null), api.list<Kpi>('kpis', 'active', null), api.metricOptions()])
      .then(([m, k, p, x]) => { setMeta(m); setKras(k.items); setAllKpis(p.items); setMetrics(x.items); setForms(x.forms || []); })
      .catch((e) => setOptionError(messageOf(e)));
  }, [draft, meta]);

  const close = () => { r.clearErrors(); setDraft(null); };
  const save = async () => { if (draft && (await r.save(draft.id, body(draft)))) setDraft(null); };
  const set = (patch: Partial<Draft>) => draft && setDraft({ ...draft, ...patch });
  const e = r.errors;

  return (
    <>
      <ListShell<Kpi>
        title="KPIs" noun="KPI" intro="Measurable results: unit, source and scoring."
        items={r.items} loadError={r.loadError} status={r.status} onStatus={r.setStatus} canEdit={canEdit}
        onAdd={() => setDraft(blank(subOrgId))} onEdit={(k) => setDraft(draftOf(k))} onArchive={r.archive}
        row={(k) => ({ name: k.name, detail: [UNIT_LABEL[k.unit], DIRECTION_LABEL[k.direction], SOURCE_LABEL[k.source], k.default_target !== null ? `Target ${k.default_target}` : null].filter(Boolean).join(' · ') })}
      />
      <Dialog open={Boolean(draft)} onClose={close} title={draft?.id ? 'Edit KPI' : 'Add KPI'} maxWidthClassName="max-w-3xl" footer={<FormFooter onCancel={close} onSave={save} saving={r.saving} />}>
        {draft && (
          <div className="space-y-4">
            {optionError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{optionError}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label="Name" required value={draft.name} onChange={(v) => set({ name: v })} error={e.name} maxLength={150} autoFocus />
              <SelectField<number> label="KRA" numeric value={draft.kraId} onChange={(v) => set({ kraId: v })} options={kras.map((k) => ({ value: k.id, label: k.name }))} placeholder="No KRA" error={e.kra_id} />
            </div>
            <Textarea label="Description" rows={2} value={draft.description} onChange={(ev) => set({ description: ev.target.value })} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SelectField<Unit> label="Measured in" value={draft.unit} onChange={(v) => v && set({ unit: v })} options={opts(meta?.units || [draft.unit], UNIT_LABEL)} error={e.unit} />
              <SelectField<Direction> label="Better when" value={draft.direction} onChange={(v) => v && set({ direction: v })} options={opts(meta?.directions || [draft.direction], DIRECTION_LABEL)} error={e.direction} />
              <SelectField<Aggregation> label="Over a period" value={draft.aggregation} onChange={(v) => v && set({ aggregation: v })} options={opts(meta?.aggregations || [draft.aggregation], AGGREGATION_LABEL)} error={e.aggregation} hint="How daily or weekly values combine." />
            </div>

            <div className="space-y-3 rounded-lg border border-line p-3">
              <p className="text-xs font-semibold text-fg sm:text-[13px]">Where the value comes from</p>
              <SelectField<Source> label="Source" value={draft.source} onChange={(v) => v && set({ source: v, measure: v === 'data_collection' ? 'field_value' : '', metric: '', formId: null, priorities: [], labels: '', linkedOnly: false })} options={opts(Object.keys(meta?.sources || { [draft.source]: 1 }) as Source[], SOURCE_LABEL)} error={e.source} />
              {draft.source in MEASURE_SOURCES && (
                <SelectField<string> label="Measure" value={draft.measure || null} onChange={(v) => set({ measure: v || '' })} error={e.source_config}
                  options={(meta?.sources[draft.source]?.measures || []).map((m) => ({ value: m, label: measureLabel(draft.source, m) }))} />
              )}
              {draft.source === 'tasks' && (
                <div className="space-y-2 rounded-lg bg-bg-subtle p-3">
                  <p className="text-[11px] text-fg-muted">Counts the person's finished tasks in each break. Narrow it down (all optional):</p>
                  <div className="flex flex-wrap items-center gap-1.5"><span className="text-xs font-semibold text-fg">Priority:</span>{(Object.keys(TASK_PRIORITY_LABEL) as (keyof typeof TASK_PRIORITY_LABEL)[]).map((p) => <Chip key={p} active={draft.priorities.includes(p)} onClick={() => set({ priorities: draft.priorities.includes(p) ? draft.priorities.filter((x) => x !== p) : [...draft.priorities, p] })}>{TASK_PRIORITY_LABEL[p]}</Chip>)}</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <TextField label="With any of these labels" value={draft.labels} onChange={(v) => set({ labels: v })} placeholder="client, visit" hint="Separate with commas." />
                    <SelectField<number> label="That asked for this form" numeric value={draft.formId} placeholder="Any task" onChange={(v) => set({ formId: v })} options={forms.map((f) => ({ value: f.id, label: f.name }))} />
                  </div>
                  <div className="flex items-center justify-between gap-3"><span className="text-xs text-fg">Only tasks linked to this goal <span className="block text-[11px] text-fg-muted">When a manager creates a task they can pick which goal it counts toward.</span></span><Switch checked={draft.linkedOnly} onChange={(v) => set({ linkedOnly: v })} label="Only linked tasks" /></div>
                </div>
              )}
              {draft.source === 'data_collection' && draft.measure !== 'field_value' && (
                <SelectField<number> label="Form" numeric value={draft.formId} onChange={(v) => set({ formId: v })} error={e.source_config} hint="Counted on each submission's work date; rejected ones are left out." options={forms.map((f) => ({ value: f.id, label: f.name }))} />
              )}
              {draft.source === 'data_collection' && draft.measure === 'field_value' && (
                <SelectField<string> label="Tracked form field" value={draft.metric || null} onChange={(v) => set({ metric: v || '' })} error={e.source_config}
                  hint={metrics.length ? undefined : 'No form field is set to "Track as metric" yet.'}
                  options={metrics.map((m) => ({ value: `${m.form_id}:${m.field_key}`, label: `${m.form_name} · ${m.label}` }))} />
              )}
              {draft.source === 'formula' && (
                <div className="space-y-2">
                  <TextField label="Formula" value={draft.expression} onChange={(v) => set({ expression: v })} error={e.source_config} placeholder="deals / leads * 100" hint="Use names for the KPIs, then pick the KPI each name stands for. Allowed: + - * / ( )" />
                  {formulaNames(draft.expression).map((n) => (
                    <SelectField<number> key={n} label={`"${n}" is`} numeric value={draft.refs[n] ?? null} onChange={(v) => set({ refs: { ...draft.refs, [n]: v } })}
                      options={allKpis.filter((k) => k.id !== draft.id).map((k) => ({ value: k.id, label: k.name }))} />
                  ))}
                </div>
              )}
              {(draft.source === 'manual' || draft.source === 'import') && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SelectField<EntryBy> label="Entered by" value={draft.entryBy} onChange={(v) => v && set({ entryBy: v })} options={opts(meta?.entry_by || [draft.entryBy], ENTRY_LABEL)} error={e.entry_by} />
                  <div className="flex items-end justify-between rounded-lg border border-line p-3">
                    <span className="text-sm text-fg">Evidence required</span>
                    <Switch checked={draft.evidence} onChange={(v) => set({ evidence: v })} label="Evidence required" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-line p-3">
              <p className="text-xs font-semibold text-fg sm:text-[13px]">How it is scored</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelectField<ScoringMethod> label="Method" value={draft.method} onChange={(v) => v && set({ method: v })} options={opts(meta?.scoring_methods || [draft.method], SCORING_LABEL)} error={e.scoring_method} />
                <TextField label="Default target" type="number" value={draft.target} onChange={(v) => set({ target: v })} error={e.default_target} hint="Optional starting value for templates." />
              </div>
              {(draft.method === 'linear' || draft.method === 'threshold') && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {draft.method === 'threshold' && <TextField label="Minimum % of target" type="number" value={draft.threshold} onChange={(v) => set({ threshold: v })} error={e.scoring_config} hint="Below this, the score is zero." />}
                  <TextField label="Highest score" type="number" value={draft.cap} onChange={(v) => set({ cap: v })} error={draft.method === 'linear' ? e.scoring_config : undefined} hint="Blank means 100. Up to 300 rewards over-achievement." />
                </div>
              )}
              {draft.method === 'range' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextField label="From" type="number" value={draft.min} onChange={(v) => set({ min: v })} error={e.scoring_config} />
                  <TextField label="To" type="number" value={draft.max} onChange={(v) => set({ max: v })} />
                </div>
              )}
              {draft.method === 'slab' && (
                <div className="space-y-2">
                  <SelectField<'achievement' | 'actual'> label="Slabs are based on" value={draft.slabBasis} onChange={(v) => v && set({ slabBasis: v })}
                    options={[{ value: 'achievement', label: '% of target reached' }, { value: 'actual', label: 'The actual value' }]} />
                  {draft.slabs.map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
                      <TextField label="From" type="number" value={s.from} onChange={(v) => set({ slabs: draft.slabs.map((x, j) => (j === i ? { ...x, from: v } : x)) })} />
                      <TextField label="Up to" type="number" value={s.to} onChange={(v) => set({ slabs: draft.slabs.map((x, j) => (j === i ? { ...x, to: v } : x)) })} hint="Blank = no limit" />
                      <TextField label="Score" type="number" value={s.score} onChange={(v) => set({ slabs: draft.slabs.map((x, j) => (j === i ? { ...x, score: v } : x)) })} />
                      <button type="button" aria-label="Remove slab" onClick={() => set({ slabs: draft.slabs.filter((_, j) => j !== i) })} className="mt-7 rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {e.scoring_config && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{e.scoring_config}</p>}
                  <Btn type="button" variant="secondary" size="sm" onClick={() => set({ slabs: [...draft.slabs, { from: '', to: '', score: '' }] })}><Plus className="h-3.5 w-3.5" /> Add slab</Btn>
                </div>
              )}
            </div>
            {!draft.id && <SubOrgPicker value={draft.subOrgId} onChange={(v) => set({ subOrgId: v })} allowShared={isOrgAdmin} />}
          </div>
        )}
      </Dialog>
    </>
  );
}
