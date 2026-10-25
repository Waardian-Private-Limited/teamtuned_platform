'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, OptionCard, TextField } from '@/components/ui/FormControls';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { usePermission } from '@/lib/hooks/usePermission';
import { useFeatures } from '@/lib/hooks/useFeatures';
import { PERF_FEATURE } from '@/features/performance/constants/perf.constants';
import * as api from '../../api/compensation.api';
import type { CycleDto, LinkablePerformanceCycleDto, RatingLevel, RatingSource } from '../../types/compensation.dto';
import { currentFyStart } from '../../utils/format';
import { Btn } from '../shared/Buttons';
import { RatingScaleEditor } from '../settings/RatingScaleEditor';
import { PerformanceCyclePicker, type PickableCycle } from './PerformanceCyclePicker';

const SOURCES: { value: RatingSource; title: string; description: string }[] = [
  { value: 'performance', title: 'Performance reviews', description: 'Released ratings from linked performance cycles' },
  { value: 'manager', title: 'Managers rate their team', description: 'Each reporting manager rates their people here; HR decides the pay' },
  { value: 'hr', title: 'HR enters ratings', description: 'Type them in the table or upload a CSV' },
];

/** Starting values when the cycle is created from somewhere else (the Performance dashboard): always rated from Performance. */
export interface CyclePrefill {
  name: string;
  periodStart: string;
  periodEnd: string;
  /** Linked from the start; listed even before they reach calibration. */
  performanceCycles: PickableCycle[];
}

interface Props {
  open: boolean;
  defaults: RatingLevel[];
  prefill?: CyclePrefill;
  onClose: () => void;
  onSaved: (cycle: CycleDto) => void;
}

export function CycleDialog({ open, defaults, prefill, onClose, onSaved }: Props) {
  const fy = currentFyStart();
  const { subOrgs } = useManageableSubOrgs();
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState('');
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [periodStart, setPeriodStart] = React.useState(`${fy - 1}-04-01`);
  const [periodEnd, setPeriodEnd] = React.useState(`${fy}-03-31`);
  const [effectiveFrom, setEffectiveFrom] = React.useState(`${fy}-04-01`);
  const [budget, setBudget] = React.useState('');
  const [minService, setMinService] = React.useState('3');
  const [includeProbation, setIncludeProbation] = React.useState(false);
  const [scale, setScale] = React.useState<RatingLevel[]>(defaults);
  const [perfCycles, setPerfCycles] = React.useState<LinkablePerformanceCycleDto[]>([]);
  const [perfIds, setPerfIds] = React.useState<number[]>([]);
  const { hasFeature } = useFeatures();
  const perfOn = hasFeature(PERF_FEATURE);
  const [source, setSource] = React.useState<RatingSource>('manager');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(prefill?.name || `FY ${fy - 1}-${String(fy % 100).padStart(2, '0')} annual appraisal`);
    if (prefill) {
      setPeriodStart(prefill.periodStart);
      setPeriodEnd(prefill.periodEnd);
    }
    setPerfIds((prefill?.performanceCycles || []).map((c) => c.id));
    setSource(prefill || perfOn ? 'performance' : 'manager');
    setSubOrgId(subOrgs.length === 1 && !isOrgAdmin ? subOrgs[0].id : null);
    setScale(defaults);
    setErrors({});
  }, [open, defaults, prefill, fy, subOrgs, isOrgAdmin, perfOn]);

  React.useEffect(() => {
    if (open && perfOn) api.performanceCycles().then((r) => setPerfCycles(r.cycles)).catch(() => setPerfCycles([]));
  }, [open, perfOn]);

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const cycle = await api.createCycle({
        name,
        sub_organization_id: subOrgId,
        period_start: periodStart,
        period_end: periodEnd,
        effective_from: effectiveFrom,
        budget_percent: budget === '' ? null : Number(budget),
        rating_scale: scale,
        rating_source: source,
        performance_cycle_ids: source === 'performance' ? perfIds : [],
        eligibility: { joinedOnOrBefore: periodEnd, minServiceMonths: Number(minService) || 0, includeProbation },
      });
      showSuccess(cycle.rating_sync?.changed ? 'Appraisal cycle created. The guide now uses Performance’s ratings: set the increment % for each.' : 'Appraisal cycle created');
      onSaved(cycle);
      onClose();
    } catch (err) {
      const field = err instanceof ApiError ? (err.data as { field?: string } | null)?.field : undefined;
      setErrors({ [field || 'name']: messageOf(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      title={<h2 className="text-sm font-bold text-fg sm:text-base">New appraisal cycle</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={saving} onClick={save}>Create cycle</Btn></>}
    >
      <div className="space-y-4">
        <TextField label="Name" required value={name} onChange={setName} error={errors.name} maxLength={150} />
        {subOrgs.length > 0 && (
          <div>
            <FieldLabel label="Sub-organization" />
            <select value={subOrgId ?? ''} onChange={(e) => setSubOrgId(e.target.value ? Number(e.target.value) : null)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg">
              {isOrgAdmin && <option value="">All sub-organizations</option>}
              {subOrgs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField label="Review period from" required type="date" value={periodStart} onChange={setPeriodStart} error={errors.period_start} />
          <TextField label="Review period to" required type="date" value={periodEnd} onChange={setPeriodEnd} error={errors.period_end} />
          <TextField label="Increments effective" required type="date" value={effectiveFrom} onChange={setEffectiveFrom} error={errors.effective_from} />
          <TextField label="Budget (% of payroll)" inputMode="decimal" value={budget} onChange={(v) => setBudget(v.replace(/[^\d.]/g, ''))} hint="Optional merit budget" error={errors.budget_percent} />
          <TextField label="Min. service (months)" type="number" min={0} max={120} value={minService} onChange={setMinService} hint="Joined at least this long before period end" />
          <div>
            <FieldLabel label="Probationers" />
            <label className="flex h-10 items-center gap-2 text-sm text-fg">
              <input type="checkbox" checked={includeProbation} onChange={(e) => setIncludeProbation(e.target.checked)} />
              Include employees on probation
            </label>
          </div>
        </div>
        <div>
          <FieldLabel label="Who rates" required />
          <div className={`grid grid-cols-1 gap-2.5 ${perfOn ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {SOURCES.filter((o) => o.value !== 'performance' || perfOn).map((o) => (
              <OptionCard key={o.value} selected={source === o.value} onClick={() => setSource(o.value)} title={o.title} description={o.description} disabled={Boolean(prefill) && o.value !== 'performance'} />
            ))}
          </div>
          {errors.rating_source && <p role="alert" className="mt-1 text-xs font-medium text-[var(--tt-danger)]">{errors.rating_source}</p>}
        </div>
        {source === 'performance' && (
          <div>
            <FieldLabel label="Performance ratings" />
            <PerformanceCyclePicker cycles={[...perfCycles, ...(prefill?.performanceCycles || []).filter((c) => !perfCycles.some((x) => x.id === c.id))]} value={perfIds} onChange={setPerfIds} error={errors.performance_cycle_ids} />
            <p className="mt-1 text-[11px] text-fg-muted">Linked cycles feed each person’s rating; the guide below takes their rating codes. You can link them later too.</p>
          </div>
        )}
        <RatingScaleEditor value={scale} onChange={setScale} error={errors.ratingScale} />
      </div>
    </Dialog>
  );
}
