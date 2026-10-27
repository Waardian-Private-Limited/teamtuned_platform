'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { showSuccess } from '@/lib/toast';
import * as api from '../../../api/labour.api';
import { METER_LABEL } from '../../../constants/labour.constants';
import type { PlanVersion } from '../../../types/labour.types';
import { parseLabourError } from '../../../utils/errors';
import { fmtDate, fmtDateTime, money, today } from '../../../utils/format';
import { Block, FormError, Pill, primaryBtn } from '../../shared/Primitives';
import { Section } from '@/components/ui/FormControls';

const METERS = Object.keys(METER_LABEL);

export function PlanPanel({ orgId }: { orgId: string }) {
  const [versions, setVersions] = useState<PlanVersion[] | null>(null);
  const [error, setError] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [rates, setRates] = useState<Record<string, string>>({});
  const [gst, setGst] = useState('18');
  const [minMonthly, setMinMonthly] = useState('0');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.saPlans(orgId).then((raw) => {
      const list = api.planList(raw);
      setVersions(list);
      const cur = list[0];
      if (cur) {
        setRates(Object.fromEntries(METERS.map((m) => [m, String(cur.components?.find((c) => c.meter === m)?.rate ?? 0)])));
        setGst(String(cur.gstPercent ?? 18));
        setMinMonthly(String(cur.minMonthly ?? 0));
      } else setRates(Object.fromEntries(METERS.map((m) => [m, '0'])));
      setError('');
    }).catch((e) => setError(parseLabourError(e).message));
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const errs: Record<string, string> = {};
    if (!effectiveFrom) errs.effectiveFrom = 'Choose the effective date';
    METERS.forEach((m) => { const n = Number(rates[m]); if (rates[m] === '' || !Number.isFinite(n) || n < 0) errs[`rate.${m}`] = 'Enter an amount'; });
    if (!Number.isFinite(Number(gst)) || Number(gst) < 0 || Number(gst) > 100) errs.gstPercent = 'Enter a percentage 0–100';
    if (!Number.isFinite(Number(minMonthly)) || Number(minMonthly) < 0) errs.minMonthly = 'Enter an amount';
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.saSavePlan(orgId, { effectiveFrom, components: METERS.map((m) => ({ meter: m, rate: Number(rates[m]) })), gstPercent: Number(gst), minMonthly: Number(minMonthly), note: note.trim() || undefined });
      showSuccess('New plan version saved');
      setNote('');
      load();
    } catch (err) {
      const e = parseLabourError(err);
      if (e.field && ['effectiveFrom', 'gstPercent', 'minMonthly', 'note'].includes(e.field)) setErrors({ [e.field]: e.message });
      else if (e.field?.startsWith('components')) setFormError(e.message);
      else setFormError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <Section title="New plan version" description="Creates a new version from the effective date. Earlier versions are kept.">
        <div className="space-y-4">
          <TextField label="Effective from" type="date" required value={effectiveFrom} error={errors.effectiveFrom} onChange={(v) => { setEffectiveFrom(v); setErrors({}); }} hint="Must be after the last issued invoice period." />
          <div className="grid gap-3 sm:grid-cols-2">
            {METERS.map((m) => <TextField key={m} label={`${METER_LABEL[m]} rate`} prefix="₹" inputMode="decimal" value={rates[m] ?? ''} error={errors[`rate.${m}`]} onChange={(v) => { setRates({ ...rates, [m]: v }); setErrors({}); }} />)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="GST %" inputMode="decimal" value={gst} error={errors.gstPercent} onChange={setGst} />
            <TextField label="Minimum per month" prefix="₹" inputMode="decimal" value={minMonthly} error={errors.minMonthly} onChange={setMinMonthly} />
          </div>
          <Textarea label="Note" value={note} error={errors.note} onChange={(e) => setNote(e.target.value)} hint="Why the rate changed. Kept in the history." />
          <FormError message={formError} />
          <button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save new version'}</button>
        </div>
      </Section>

      <Section title="Version history">
        <FormError message={error} />
        {!versions ? <Block className="h-32" /> : versions.length === 0 ? <p className="text-sm text-fg-muted">No plan yet. Save the first version to start billing.</p> : (
          <ol className="space-y-3">
            {versions.map((v, i) => (
              <li key={v.id ?? i} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-fg">Version {v.version ?? versions.length - i}</p>{i === 0 && <Pill tone="dark">Latest</Pill>}</div>
                <p className="text-xs text-fg-muted">From {fmtDate(v.effectiveFrom)} · by {v.createdBy ?? 'unknown'} · {fmtDateTime(v.createdAt)}</p>
                {v.note && <p className="mt-1 text-sm text-fg">“{v.note}”</p>}
                {v.changes && v.changes.length > 0 ? (
                  <ul className="mt-2 space-y-0.5 text-xs">
                    {v.changes.map((c, j) => <li key={j} className="flex justify-between gap-2"><span>{METER_LABEL[c.meter] || c.meter}</span><span className="tabular-nums text-fg-muted">{c.from === null ? 'new' : money(c.from)} → <span className="font-semibold text-fg">{c.to === null ? 'removed' : money(c.to)}</span></span></li>)}
                  </ul>
                ) : <p className="mt-2 text-xs text-fg-muted">{i === versions.length - 1 ? 'First version.' : 'No rate changes.'}</p>}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
