'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { StatusPill } from '@/components/ui/StatusPill';
import * as api from '../api/perf.api';
import { AGGREGATION_LABEL, DIRECTION_LABEL, SECTION_LABEL, SHEET_STATUS_LABEL, SOURCE_LABEL, UNIT_LABEL } from '../constants/perf.constants';
import { errorsOf, type FieldErrors } from '../hooks/useResource';
import type { Aggregation, Direction, GoalItem, Sheet, SheetOptions, Unit } from '../types/perf.types';
import { FormFooter, num, numText } from './parts';
import { FeedbackPanel } from './FeedbackPanel';
import { ReviewPanel } from './ReviewPanel';
import { ScorecardPanel } from './ScorecardPanel';
import { Btn, PageHead } from './ui';

interface Row { key: string; id: number | null; type: 'kpi' | 'competency'; origin: GoalItem['origin']; kpiId: number | null; competencyId: number | null; name: string; sub: string; unit: Unit | null; weight: string; target: string; typed: boolean; direction: Direction | null; aggregation: Aggregation | null;
  /** One box per break; null when the goal uses its yearly target in every break. */
  breakTargets: string[] | null }

const rowOf = (i: GoalItem): Row => ({
  key: `g${i.id}`, id: i.id, type: i.item_type, origin: i.origin, kpiId: i.kpi_id, competencyId: i.competency_id, name: i.name,
  sub: [i.kra_name, i.unit ? UNIT_LABEL[i.unit] : null, i.source && i.source !== 'manual' ? SOURCE_LABEL[i.source] : null].filter(Boolean).join(' · '),
  unit: i.unit, weight: numText(i.weight), target: numText(i.target), typed: i.item_type === 'kpi' && !i.kpi_id, direction: i.direction, aggregation: i.aggregation,
  breakTargets: i.period_targets && i.period_targets.some((x) => x !== null) ? i.period_targets.map(numText) : null,
});

const total = (rows: Row[]) => Math.round(rows.reduce((s, r) => s + (num(r.weight) || 0), 0) * 100) / 100;
const tone = (s: Sheet['status']) => (s === 'approved' ? 'active' : s === 'revision_requested' ? 'inactive' : 'neutral');
let tempId = 0;

interface Typed { name: string; unit: Unit; direction: Direction; aggregation: Aggregation }
const blankTyped = (): Typed => ({ name: '', unit: 'number', direction: 'higher_better', aggregation: 'sum' });

export function SheetEditor({ id, backHref }: { id: number; backHref: string }) {
  const [sheet, setSheet] = React.useState<Sheet | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [error, setError] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [busy, setBusy] = React.useState<'' | 'save' | 'submit' | 'withdraw'>('');
  const [options, setOptions] = React.useState<SheetOptions | null>(null);
  const [pick, setPick] = React.useState<{ kpi: number | null; competency: number | null }>({ kpi: null, competency: null });
  const [typed, setTyped] = React.useState<Typed | null>(null);

  const apply = React.useCallback((s: Sheet) => { setSheet(s); setRows(s.items.map(rowOf)); }, []);
  React.useEffect(() => { api.getSheet(id).then(apply).catch((e) => setError(messageOf(e))); }, [id, apply]);
  React.useEffect(() => {
    if (sheet?.permissions.can_edit && !options) api.sheetOptions(id).then(setOptions).catch((e) => setError(messageOf(e)));
  }, [sheet, options, id]);

  if (!sheet) return error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;

  const p = sheet.permissions;
  const breaks = sheet.periods || [];
  const edit = p.can_edit;
  const setRow = (key: string, patch: Partial<Row>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const canRemove = (r: Row) => edit && (p.is_manager || r.origin === 'employee');

  const payload = () => rows.map((r) => {
    const base = { weight: num(r.weight) ?? 0, ...(r.type === 'kpi' ? { target: num(r.target), period_targets: r.breakTargets ? r.breakTargets.map(num) : null } : {}) };
    if (r.id) return { id: r.id, ...base, ...(r.typed ? { name: r.name, unit: r.unit, direction: r.direction, aggregation: r.aggregation } : {}) };
    if (r.typed) return { item_type: 'kpi', name: r.name, unit: r.unit, direction: r.direction, aggregation: r.aggregation, ...base };
    return { item_type: r.type, ...(r.type === 'kpi' ? { kpi_id: r.kpiId } : { competency_id: r.competencyId }), ...base };
  });

  const act = async (kind: 'save' | 'submit' | 'withdraw') => {
    setBusy(kind); setError(''); setErrors({});
    try {
      if (kind !== 'withdraw') await api.saveSheet(id, { items: payload() });
      const next = kind === 'save' ? await api.getSheet(id) : kind === 'submit' ? await api.submitSheet(id) : await api.withdrawSheet(id);
      apply(next);
      showSuccess(kind === 'save' ? 'Saved' : kind === 'submit' ? (next.status === 'approved' ? 'Goals approved' : 'Sent for approval') : 'Withdrawn');
    } catch (err) {
      const e = errorsOf(err, 'items');
      setErrors(e);
      if (!e.items) setError(messageOf(err));
      // a failed submit still saved the edits; show the saved state
      if (kind === 'submit') api.getSheet(id).then(apply).catch(() => undefined);
    } finally { setBusy(''); }
  };

  const addLibrary = (type: 'kpi' | 'competency') => {
    const chosen = type === 'kpi' ? options?.kpis.find((k) => k.id === pick.kpi) : options?.competencies.find((c) => c.id === pick.competency);
    if (!chosen) return;
    const k = type === 'kpi' ? (chosen as SheetOptions['kpis'][number]) : null;
    tempId += 1;
    setRows([...rows, {
      key: `n${tempId}`, id: null, type, origin: p.is_manager ? 'manager' : 'employee', kpiId: type === 'kpi' ? chosen.id : null, competencyId: type === 'competency' ? chosen.id : null, name: chosen.name,
      sub: k ? [k.kra_name, UNIT_LABEL[k.unit]].filter(Boolean).join(' · ') : '', unit: k?.unit ?? null, weight: '0', target: numText(k?.default_target), typed: false, direction: null, aggregation: null, breakTargets: null,
    }]);
    setPick({ kpi: null, competency: null });
  };

  const addTyped = () => {
    if (!typed || !typed.name.trim()) { setErrors({ typed: 'Enter a name' }); return; }
    tempId += 1;
    setRows([...rows, { key: `n${tempId}`, id: null, type: 'kpi', origin: p.is_manager ? 'manager' : 'employee', kpiId: null, competencyId: null, name: typed.name.trim(), sub: UNIT_LABEL[typed.unit], unit: typed.unit, weight: '0', target: '', typed: true, direction: typed.direction, aggregation: typed.aggregation, breakTargets: null }]);
    setTyped(null); setErrors({});
  };

  const section = (type: 'kpi' | 'competency') => {
    const list = rows.filter((r) => r.type === type);
    const weight = sheet.section_weights[type];
    if (!list.length && !weight && !edit) return null;
    const sum = total(list);
    return (
      <div className="space-y-2 rounded-lg border border-line p-3">
        <p className="text-xs font-semibold text-fg sm:text-[13px]">
          {SECTION_LABEL[type]} {weight ? <span className="font-normal text-fg-muted">· {weight}% of the final score</span> : <span className="font-normal text-fg-muted">· not part of this template</span>}
          {list.length > 0 && <span className={sum === 100 ? 'font-normal text-fg-muted' : 'font-normal text-[var(--tt-danger)]'}> · weights total {sum} of 100</span>}
        </p>
        {list.length === 0 && <p className="text-xs text-fg-muted">None yet.</p>}
        {list.map((r) => (
          <div key={r.key} className="space-y-1.5">
          <div className={`grid items-start gap-2 ${type === 'kpi' ? 'grid-cols-[1fr_5.5rem_6.5rem_auto]' : 'grid-cols-[1fr_5.5rem_auto]'}`}>
            <div className="min-w-0 pt-2">
              <p className="truncate text-sm font-semibold text-fg">{r.name}{r.origin !== 'template' && <span className="ml-2 rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">Added by {r.origin}</span>}</p>
              {r.sub && <p className="truncate text-[11px] text-fg-muted">{r.sub}</p>}
            </div>
            <TextField label="" type="number" aria-label="Weight" value={r.weight} disabled={!edit} onChange={(v) => setRow(r.key, { weight: v })} suffix={<span className="text-xs text-fg-muted">%</span>} />
            {type === 'kpi' && <TextField label="" type="number" aria-label="Target" placeholder="Target" value={r.target} disabled={!edit} onChange={(v) => setRow(r.key, { target: v })} />}
            {canRemove(r) ? (
              <button type="button" aria-label={`Remove ${r.name}`} onClick={() => setRows(rows.filter((x) => x.key !== r.key))} className="mt-1.5 rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]"><Trash2 className="h-4 w-4" /></button>
            ) : <span />}
          </div>
          {type === 'kpi' && breaks.length > 0 && (edit || r.breakTargets) && (
            <div className="ml-0 rounded-lg bg-bg-subtle px-2.5 py-2 sm:ml-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-fg-muted">{r.breakTargets ? 'Target for each break' : 'Same target logic in every break: totals are split evenly, averages and rates stay as they are.'}</p>
                {edit && <button type="button" onClick={() => setRow(r.key, { breakTargets: r.breakTargets ? null : breaks.map(() => '') })} className="text-[11px] font-semibold text-fg underline-offset-4 hover:underline">{r.breakTargets ? 'Use the yearly target' : 'Set per break'}</button>}
              </div>
              {r.breakTargets && (
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {breaks.map((b, n) => (
                    <TextField key={b.id} label="" type="number" aria-label={`Target for ${b.label}`} placeholder={b.label} prefix={<span className="text-[11px] text-fg-muted">{b.label}</span>} value={r.breakTargets?.[n] ?? ''} disabled={!edit}
                      onChange={(v) => setRow(r.key, { breakTargets: (r.breakTargets || breaks.map(() => '')).map((x, i) => (i === n ? v : x)) })} />
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        ))}
        {edit && (
          <div className="flex flex-wrap items-end gap-2 pt-1">
            <div className="min-w-56 flex-1">
              <SelectField<number> label="" numeric value={type === 'kpi' ? pick.kpi : pick.competency} placeholder={`Add a ${type === 'kpi' ? 'KPI' : 'competency'} from the library`}
                onChange={(v) => setPick(type === 'kpi' ? { ...pick, kpi: v } : { ...pick, competency: v })}
                options={(type === 'kpi' ? options?.kpis || [] : options?.competencies || []).filter((o) => !rows.some((r) => (type === 'kpi' ? r.kpiId : r.competencyId) === o.id)).map((o) => ({ value: o.id, label: o.name }))} />
            </div>
            <Btn type="button" variant="secondary" size="field" onClick={() => addLibrary(type)} disabled={!(type === 'kpi' ? pick.kpi : pick.competency)}><Plus className="h-3.5 w-3.5" /> Add</Btn>
            {type === 'kpi' && p.can_add_custom && <Btn type="button" variant="secondary" size="field" onClick={() => { setErrors({}); setTyped(blankTyped()); }}>Write my own</Btn>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead
        help={HELP.sheet}
        title={<><Link href={backHref} aria-label="Back" className="rounded-[var(--tt-radius-sm)] p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>{sheet.employee_name}<span className="text-sm font-normal text-fg-muted">{sheet.cycle_name}</span><StatusPill label={SHEET_STATUS_LABEL[sheet.status]} tone={tone(sheet.status)} /></>}
        subtitle={`${sheet.period_start} to ${sheet.period_end} · ${sheet.template_name || 'No template'} · Reviewer: ${sheet.reviewer_name || 'None'}`}
      >
        {sheet.status === 'revision_requested' && sheet.decision_note && <p className="text-sm text-fg"><span className="font-semibold">Changes asked for:</span> {sheet.decision_note}</p>}
        {sheet.status === 'submitted' && <p className="text-xs text-fg-muted">Waiting for approval. Goals cannot be changed until it is decided{p.can_withdraw ? ', unless you withdraw it' : ''}.</p>}
        {sheet.status === 'approved' && <p className="text-xs text-fg-muted">These goals are approved and locked.</p>}
        {!edit && sheet.status === 'draft' && sheet.cycle_status === 'goal_setting' && <p className="text-xs text-fg-muted">Your reviewer is setting these goals. You will see them here once they are approved.</p>}
      </PageHead>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-line bg-surface p-3 tt-scroll-hidden sm:p-4">
        {sheet.status === 'approved' && ['in_progress', 'review', 'calibration', 'released', 'closed'].includes(sheet.cycle_status) && <><ScorecardPanel sheetId={id} />{sheet.section_weights.feedback ? <FeedbackPanel sheetId={id} /> : null}<ReviewPanel sheetId={id} /></>}
        {section('kpi')}
        {section('competency')}
        {errors.items && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.items}</p>}
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
        {(edit || p.can_withdraw) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-xs text-fg-muted">{edit && sheet.cycle_status === 'draft' ? 'The cycle is a draft: prepare goals now; they can be submitted once goal setting opens.' : edit ? (sheet.needs_approval ? 'Submitting sends the goals for approval.' : 'Submitting approves the goals straight away.') : ''}{edit && sheet.ready.items ? ` Not ready yet: ${sheet.ready.items}.` : ''}</p>
            <div className="flex gap-2">
              {p.can_withdraw && <Btn type="button" variant="secondary" loading={busy === 'withdraw'} onClick={() => act('withdraw')}>Withdraw</Btn>}
              {edit && <Btn type="button" variant="secondary" loading={busy === 'save'} disabled={Boolean(busy)} onClick={() => act('save')}>Save</Btn>}
              {edit && p.can_submit && <Btn type="button" loading={busy === 'submit'} disabled={Boolean(busy)} onClick={() => act('submit')}>Submit</Btn>}
            </div>
          </div>
        )}
      </div>

      <Dialog open={Boolean(typed)} onClose={() => setTyped(null)} title="Write my own goal" footer={<FormFooter onCancel={() => setTyped(null)} onSave={addTyped} saving={false} label="Add goal" />}>
        {typed && (
          <div className="space-y-3">
            <TextField label="Goal" required value={typed.name} onChange={(v) => setTyped({ ...typed, name: v })} error={errors.typed} maxLength={150} autoFocus />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SelectField<Unit> label="Measured in" value={typed.unit} onChange={(v) => v && setTyped({ ...typed, unit: v })} options={(Object.keys(UNIT_LABEL) as Unit[]).map((v) => ({ value: v, label: UNIT_LABEL[v] }))} />
              <SelectField<Direction> label="Better when" value={typed.direction} onChange={(v) => v && setTyped({ ...typed, direction: v })} options={(Object.keys(DIRECTION_LABEL) as Direction[]).map((v) => ({ value: v, label: DIRECTION_LABEL[v] }))} />
              <SelectField<Aggregation> label="Over a period" value={typed.aggregation} onChange={(v) => v && setTyped({ ...typed, aggregation: v })} options={(Object.keys(AGGREGATION_LABEL) as Aggregation[]).map((v) => ({ value: v, label: AGGREGATION_LABEL[v] }))} />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
