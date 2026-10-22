'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, OptionCard, Section, SelectField, TextField } from '@/components/ui/FormControls';
import { usePermission } from '@/lib/hooks/usePermission';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import * as api from '../api/perf.api';
import { addDays, chain, daysBetween, evenSplit, evenWeights, generate, shortRange, toMs, weightTotal } from '../breaks';
import { CHECK_IN_LABEL, CYCLE_TYPE_LABEL, ELIGIBILITY_LABEL, SCORE_BASIS_HINT, SCORE_BASIS_LABEL } from '../constants/perf.constants';
import { errorsOf, type FieldErrors } from '../hooks/useResource';
import type { BreakDraft, CheckIn, Cycle, CycleType, Eligibility, RuleOptions, ScoreBasis, Template } from '../types/perf.types';
import { FormFooter, num } from './parts';
import { Btn } from './ui';

type EligKey = keyof typeof ELIGIBILITY_LABEL;
const ELIG_SOURCE: Record<EligKey, keyof RuleOptions> = { employment_type_ids: 'employment_types', department_ids: 'departments', site_ids: 'sites', role_ids: 'roles', grade_ids: 'grades' };
const SPLITS: CheckIn[] = ['none', 'quarterly', 'half_yearly', 'monthly', 'custom'];
const SPLIT_HINT: Record<CheckIn, string> = {
  none: 'The cycle is one block. Good for a simple yearly review.',
  quarterly: 'Q1 to Q4. Rename them, for example Apr-Jun.',
  half_yearly: 'H1 and H2.',
  monthly: 'One break per month.',
  custom: 'Your own breaks with your own dates, for example 4 uneven parts.',
};
const BASES: ScoreBasis[] = ['whole_cycle', 'average', 'weighted', 'last'];

interface Draft {
  name: string; type: CycleType; start: string; end: string; checkIn: CheckIn; basis: ScoreBasis; breaks: BreakDraft[];
  templateId: number | null; elig: Eligibility; tenure: string; subOrgId: number | null;
}

const fromCycle = (c: Cycle): Draft => ({
  name: c.name, type: c.cycle_type, start: c.period_start, end: c.period_end, checkIn: c.check_in, basis: c.score_basis || 'whole_cycle',
  breaks: (c.periods || []).map((p) => ({ label: p.label, period_start: p.period_start, period_end: p.period_end, weight: p.weight ?? null })),
  templateId: c.template_id, elig: c.eligibility || {}, tenure: c.eligibility?.min_tenure_days ? String(c.eligibility.min_tenure_days) : '', subOrgId: c.sub_organization_id,
});
const blank = (subOrgId: number | null): Draft => ({ name: '', type: 'annual', start: '', end: '', checkIn: 'quarterly', basis: 'whole_cycle', breaks: [], templateId: null, elig: {}, tenure: '', subOrgId });

/** Keeps names and weights the company typed when the split is regenerated with the same number of breaks. */
const keepNames = (next: BreakDraft[], prev: BreakDraft[]) => (next.length === prev.length ? next.map((b, i) => ({ ...b, label: prev[i].label || b.label, weight: prev[i].weight })) : next);

/** Create a cycle, or edit one that is still a draft. Includes the split into breaks and how the year-end score is worked out. */
export function CycleForm({ cycle, subOrgId, open, onClose, onSaved }: { cycle: Cycle | null; subOrgId: number | null; open: boolean; onClose: () => void; onSaved: (c: Cycle) => void }) {
  const { isOrgAdmin } = usePermission();
  const [draft, setDraft] = React.useState<Draft>(() => (cycle ? fromCycle(cycle) : blank(subOrgId)));
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [saving, setSaving] = React.useState(false);
  const [options, setOptions] = React.useState<RuleOptions | null>(null);
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loadError, setLoadError] = React.useState('');
  const [splitCount, setSplitCount] = React.useState('4');

  React.useEffect(() => {
    if (!open) return;
    setDraft(cycle ? fromCycle(cycle) : blank(subOrgId));
    setErrors({});
  }, [open, cycle, subOrgId]);

  React.useEffect(() => {
    if (!open || options) return;
    Promise.all([api.ruleOptions(), api.list<Template>('templates', 'active', null)])
      .then(([o, t]) => { setOptions(o); setTemplates(t.items); })
      .catch((e) => setLoadError(messageOf(e)));
  }, [open, options]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  // Fixed splits follow the dates; a custom split keeps its rows and is stretched to the new start and end.
  const resplit = (d: Draft): BreakDraft[] => {
    if (d.checkIn === 'none') return [];
    if (d.checkIn !== 'custom') return keepNames(generate(d.start, d.end, d.checkIn), d.breaks);
    if (!d.breaks.length) return evenSplit(d.start, d.end, 4);
    const list = chain(d.breaks, d.start);
    return list.map((b, i) => (i === list.length - 1 ? { ...b, period_end: d.end } : b));
  };
  const setDates = (patch: Partial<Pick<Draft, 'start' | 'end'>>) => setDraft((d) => {
    const next = { ...d, ...patch };
    return toMs(next.start) !== null && toMs(next.end) !== null ? { ...next, breaks: resplit(next) } : next;
  });
  const setSplit = (checkIn: CheckIn) => setDraft((d) => {
    const next = { ...d, checkIn, breaks: checkIn === 'custom' && d.breaks.length ? d.breaks : [] };
    return { ...next, breaks: resplit(next), basis: checkIn === 'none' ? 'whole_cycle' : d.basis };
  });
  const setBasis = (basis: ScoreBasis) => setDraft((d) => ({ ...d, basis, breaks: basis === 'weighted' && d.breaks.some((b) => b.weight === null) ? evenWeights(d.breaks) : d.breaks }));
  const editBreak = (i: number, patch: Partial<BreakDraft>) => setDraft((d) => {
    const list = d.breaks.map((b, n) => (n === i ? { ...b, ...patch } : b));
    return { ...d, breaks: patch.period_end ? chain(list, d.start) : list };
  });
  // Adds a break by cutting the last one in two.
  const addBreak = () => setDraft((d) => {
    const last = d.breaks[d.breaks.length - 1];
    if (!last || toMs(last.period_start) === null || toMs(last.period_end) === null) return d;
    const days = daysBetween(last.period_start, last.period_end);
    if (days < 1) return d;
    const midEnd = addDays(last.period_start, Math.floor(days / 2));
    const tail: BreakDraft = { label: `Break ${d.breaks.length + 1}`, period_start: addDays(midEnd, 1), period_end: last.period_end, weight: null };
    return { ...d, breaks: [...d.breaks.slice(0, -1), { ...last, period_end: midEnd }, tail] };
  });
  const removeBreak = (i: number) => setDraft((d) => {
    if (d.breaks.length <= 2) return d;
    const list = d.breaks.filter((_, n) => n !== i);
    // The break before the removed one (or the new first one) takes over its days.
    if (i === d.breaks.length - 1) list[list.length - 1] = { ...list[list.length - 1], period_end: d.end };
    return { ...d, breaks: chain(list, d.start) };
  });
  const toggle = (key: EligKey, id: number) => {
    const cur = draft.elig[key] || [];
    set({ elig: { ...draft.elig, [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } });
  };

  const save = async () => {
    setSaving(true); setErrors({});
    try {
      const saved = await api.saveCycle(cycle?.id ?? null, {
        name: draft.name, cycle_type: draft.type, period_start: draft.start, period_end: draft.end, check_in: draft.checkIn, score_basis: draft.basis,
        breaks: draft.breaks.map((b) => ({ ...b, weight: draft.basis === 'weighted' ? b.weight : null })),
        template_id: draft.templateId, eligibility: { ...draft.elig, min_tenure_days: num(draft.tenure) ?? undefined },
        ...(cycle ? {} : { sub_organization_id: draft.subOrgId }),
      });
      showSuccess(cycle ? 'Cycle updated' : 'Cycle created');
      onSaved(saved);
    } catch (err) { setErrors(errorsOf(err, 'name')); } finally { setSaving(false); }
  };

  const total = toMs(draft.start) !== null && toMs(draft.end) !== null ? daysBetween(draft.start, draft.end) + 1 : 0;
  const weighted = draft.basis === 'weighted';
  const wTotal = weightTotal(draft.breaks);

  return (
    <Dialog open={open} onClose={onClose} title={cycle ? 'Edit cycle' : 'New review cycle'} maxWidthClassName="max-w-3xl"
      footer={<FormFooter onCancel={onClose} onSave={save} saving={saving} label={cycle ? 'Save changes' : 'Create cycle'} />}>
      <div className="space-y-4">
        {loadError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{loadError}</p>}
        <Section title="Basics" description="The name people see and the dates the cycle covers.">
          <div className="space-y-3">
            <TextField label="Name" required value={draft.name} onChange={(v) => set({ name: v })} error={errors.name} placeholder="FY 2025-26" maxLength={150} autoFocus />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SelectField<CycleType> label="Type" value={draft.type} onChange={(v) => v && set({ type: v })} options={(Object.keys(CYCLE_TYPE_LABEL) as CycleType[]).map((v) => ({ value: v, label: CYCLE_TYPE_LABEL[v] }))} error={errors.cycle_type} />
              <TextField label="Starts" type="date" required value={draft.start} onChange={(v) => setDates({ start: v })} error={errors.period_start} />
              <TextField label="Ends" type="date" required value={draft.end} onChange={(v) => setDates({ end: v })} error={errors.period_end} />
            </div>
          </div>
        </Section>

        <Section title="Breaks" description="Split the cycle into parts. Each break gets its own values, check-in and score, and can be closed when it ends.">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SPLITS.map((k) => <OptionCard key={k} selected={draft.checkIn === k} onClick={() => setSplit(k)} title={CHECK_IN_LABEL[k]} description={SPLIT_HINT[k]} />)}
            </div>
            {draft.checkIn !== 'none' && !total && <p className="text-xs text-fg-muted">Pick the start and end dates to see the breaks.</p>}
            {draft.breaks.length > 0 && total > 0 && (
              <>
                <Timeline breaks={draft.breaks} total={total} />
                {draft.checkIn === 'custom' && (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-36"><TextField label="Equal breaks" type="number" min={2} max={24} value={splitCount} onChange={setSplitCount} /></div>
                    <Btn type="button" variant="secondary" onClick={() => set({ breaks: evenSplit(draft.start, draft.end, Math.max(2, Math.min(24, Number(splitCount) || 4))) })}>Split evenly</Btn>
                    <Btn type="button" variant="secondary" onClick={addBreak} disabled={draft.breaks.length >= 24}><Plus className="h-3.5 w-3.5" /> Add break</Btn>
                  </div>
                )}
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[520px] text-xs">
                    <thead className="bg-bg-subtle text-left text-fg-muted">
                      <tr><th className="px-2 py-2 font-semibold">#</th><th className="px-2 py-2 font-semibold">Name</th><th className="px-2 py-2 font-semibold">From</th><th className="px-2 py-2 font-semibold">To</th>{weighted && <th className="px-2 py-2 font-semibold">Weight %</th>}{draft.checkIn === 'custom' && <th />}</tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {draft.breaks.map((b, i) => {
                        const custom = draft.checkIn === 'custom';
                        return (
                          <tr key={i}>
                            <td className="px-2 py-1.5 text-fg-muted">{i + 1}</td>
                            <td className="px-2 py-1.5"><input aria-label={`Name of break ${i + 1}`} value={b.label} maxLength={80} onChange={(e) => editBreak(i, { label: e.target.value })} className="h-8 w-full rounded-md border border-line bg-surface px-2 text-xs text-fg focus:border-line-strong focus:outline-none" /></td>
                            <td className="px-2 py-1.5 text-fg">{b.period_start || '—'}</td>
                            <td className="px-2 py-1.5">
                              {custom && i < draft.breaks.length - 1
                                ? <input type="date" aria-label={`End of break ${i + 1}`} value={b.period_end} min={b.period_start} max={draft.end} onChange={(e) => editBreak(i, { period_end: e.target.value })} className="h-8 rounded-md border border-line bg-surface px-2 text-xs text-fg focus:border-line-strong focus:outline-none" />
                                : <span className="text-fg">{b.period_end}</span>}
                            </td>
                            {weighted && <td className="px-2 py-1.5"><input type="number" aria-label={`Weight of break ${i + 1}`} min={0} max={100} value={b.weight ?? ''} onChange={(e) => editBreak(i, { weight: e.target.value === '' ? null : Number(e.target.value) })} className="h-8 w-20 rounded-md border border-line bg-surface px-2 text-xs text-fg focus:border-line-strong focus:outline-none" /></td>}
                            {custom && <td className="px-2 py-1.5 text-right"><button type="button" aria-label={`Remove break ${i + 1}`} disabled={draft.breaks.length <= 2} onClick={() => removeBreak(i)} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button></td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {weighted && (
                  <div className="flex items-center justify-between text-xs">
                    <span className={Math.abs(wTotal - 100) < 0.011 ? 'text-fg-muted' : 'font-semibold text-[var(--tt-danger)]'}>Weights add up to {wTotal}%{Math.abs(wTotal - 100) < 0.011 ? '' : ' — they must add up to 100'}</span>
                    <button type="button" onClick={() => set({ breaks: evenWeights(draft.breaks) })} className="font-semibold text-fg underline-offset-4 hover:underline">Spread evenly</button>
                  </div>
                )}
              </>
            )}
            {errors.breaks && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.breaks}</p>}
          </div>
        </Section>

        {draft.checkIn !== 'none' && (
          <Section title="Year-end score" description="How the breaks turn into the final goal score.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BASES.map((k) => <OptionCard key={k} selected={draft.basis === k} onClick={() => setBasis(k)} title={SCORE_BASIS_LABEL[k]} description={SCORE_BASIS_HINT[k]} />)}
            </div>
            {errors.score_basis && <p role="alert" className="mt-2 text-xs font-medium text-[var(--tt-danger)]">{errors.score_basis}</p>}
          </Section>
        )}

        <Section title="Who is invited" description="Leave a group empty to include everyone.">
          <div className="space-y-3">
            <SelectField<number> label="Template for everyone" numeric value={draft.templateId} onChange={(v) => set({ templateId: v })} placeholder="Use the Who gets what rules" options={templates.map((t) => ({ value: t.id, label: t.name }))} error={errors.template_id} hint="Pick one to skip the rules and give every invited employee this template." />
            {(Object.keys(ELIGIBILITY_LABEL) as EligKey[]).map((k) => {
              const list = (options?.[ELIG_SOURCE[k]] as { id: number; name: string }[] | undefined) || [];
              if (!list.length) return null;
              return (
                <div key={k}>
                  <p className="mb-1.5 text-xs text-fg-muted">{ELIGIBILITY_LABEL[k]}</p>
                  <div className="flex flex-wrap gap-1.5">{list.map((o) => <Chip key={o.id} active={Boolean(draft.elig[k]?.includes(o.id))} onClick={() => toggle(k, o.id)}>{o.name}</Chip>)}</div>
                </div>
              );
            })}
            <TextField label="Joined at least this many days before the cycle starts" type="number" value={draft.tenure} onChange={(v) => set({ tenure: v })} hint="Optional. For example 90 leaves out new joiners." />
            {errors.eligibility && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.eligibility}</p>}
            {!cycle && <SubOrgPicker value={draft.subOrgId} onChange={(v) => set({ subOrgId: v })} allowShared={isOrgAdmin} />}
          </div>
        </Section>
      </div>
    </Dialog>
  );
}

/** The cycle as one bar, each break as wide as its days. Ink shades alternate so neighbours stay apart. */
export function Timeline({ breaks, total, today }: { breaks: { label: string; period_start: string; period_end: string; closed_at?: string | null }[]; total: number; today?: string }) {
  return (
    <div className="flex h-10 w-full overflow-hidden rounded-lg border border-line">
      {breaks.map((b, i) => {
        const days = toMs(b.period_start) !== null && toMs(b.period_end) !== null ? daysBetween(b.period_start, b.period_end) + 1 : 0;
        const current = today && b.period_start <= today && today <= b.period_end;
        return (
          <div key={i} title={`${b.label}: ${shortRange(b.period_start, b.period_end)}`} style={{ width: `${Math.max(2, (days / total) * 100)}%` }}
            className={`flex min-w-0 flex-col justify-center border-r border-line px-1.5 last:border-r-0 ${current ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : i % 2 ? 'bg-bg-subtle text-fg' : 'bg-surface text-fg'}`}>
            <span className="truncate text-[11px] font-semibold leading-tight">{b.label}</span>
            <span className={`truncate text-[10px] leading-tight ${current ? 'opacity-80' : 'text-fg-muted'}`}>{b.closed_at ? 'Closed' : shortRange(b.period_start, b.period_end)}</span>
          </div>
        );
      })}
    </div>
  );
}
