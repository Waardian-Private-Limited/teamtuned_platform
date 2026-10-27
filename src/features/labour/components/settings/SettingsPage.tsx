'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { LP, LABOUR_SETTINGS_PAGE_PERMS } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import type { LabourSettings } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { slabProblem } from '../../utils/pay';
import { DEFAULT_HAJRI_SLABS } from '../../constants/labour.constants';
import { HajriSlabs } from './HajriSlabs';
import { Block, FormError, Gate, PageHeader, primaryBtn, secondaryBtn } from '../shared/Primitives';
import { Section } from '@/components/ui/FormControls';

export function SettingsPage() {
  const { enabled, canAny } = useLabourAccess();
  return <Gate enabled={enabled} allowed={canAny(LABOUR_SETTINGS_PAGE_PERMS)} what="labour settings"><Settings /></Gate>;
}

function ToggleRow({ title, hint, checked, onChange, disabled }: { title: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0"><p className="text-sm font-semibold text-fg">{title}</p>{hint && <p className="text-[11px] text-fg-muted sm:text-xs">{hint}</p>}</div>
      <Switch label={title} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function Settings() {
  const { can } = useLabourAccess();
  const canEdit = can(LP.SETTINGS);
  const { subOrgs } = useManageableSubOrgs();
  const [scope, setScope] = useState<number | null>(null);
  const [draft, setDraft] = useState<LabourSettings | null>(null);
  const [overrides, setOverrides] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setDraft(null);
    api.getSettings(scope).then((r) => { setDraft(r.settings); setOverrides(r.overrides || []); setError(''); }).catch((e) => setError(messageOf(e)));
  }, [scope]);
  useEffect(() => { load(); }, [load]);

  if (error) return <FormError message={error} />;
  const set = (p: Partial<LabourSettings>) => { setDraft((d) => (d ? { ...d, ...p } : d)); setErrors({}); };
  const setReg = (p: Partial<LabourSettings['regularization']>) => { setDraft((d) => (d ? { ...d, regularization: { ...d.regularization, ...p } } : d)); setErrors({}); };

  const save = async () => {
    if (!draft) return;
    const errs: Record<string, string> = {};
    if (!/^\d{2}:\d{2}$/.test(draft.dayStartsAt)) errs.dayStartsAt = 'Enter a time';
    if (!(draft.standardHours > 0 && draft.standardHours <= 24)) errs.standardHours = 'Enter hours between 1 and 24';
    if (!(draft.duplicatePunchSeconds >= 0)) errs.duplicatePunchSeconds = 'Enter seconds, 0 or more';
    if (!(draft.regularization.maxBackDays >= 0)) errs['regularization.maxBackDays'] = 'Enter days, 0 or more';
    const slabErr = slabProblem(draft.hajri?.slabs || DEFAULT_HAJRI_SLABS);
    if (slabErr) errs['hajri.slabs'] = slabErr;
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.saveSettings(draft, scope);
      showSuccess('Settings saved');
      load();
    } catch (err) {
      const p = placeError(err);
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };
  const resetOverride = async () => { if (scope) { try { await api.deleteSettingsOverride(scope); showSuccess('Now using the organization default'); load(); } catch (e) { setFormError(messageOf(e)); } } };
  const nf = (v: string) => (v === '' ? NaN : Number(v));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Labour settings" description="Work day, attendance rules and what the team may correct by hand.">
        {subOrgs.length > 1 && (
          <select aria-label="Company" value={scope ?? ''} onChange={(e) => setScope(e.target.value ? Number(e.target.value) : null)} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg sm:text-sm">
            <option value="">Organization default</option>
            {subOrgs.map((s) => <option key={s.id} value={s.id}>{s.name}{overrides.includes(s.id) ? ' (custom)' : ''}</option>)}
          </select>
        )}
      </PageHeader>
      {!draft ? <Block className="h-64 rounded-xl" /> : (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <Section title="Attendance" description="How the work day is cut and how punches are counted.">
            <div className="space-y-4">
              <TextField label="Work day starts at" type="time" value={draft.dayStartsAt} error={errors.dayStartsAt} disabled={!canEdit} hint="A punch before this time belongs to the previous work day." onChange={(v) => set({ dayStartsAt: v })} />
              <TextField label="Standard hours per day" inputMode="decimal" value={String(draft.standardHours)} error={errors.standardHours} disabled={!canEdit} onChange={(v) => set({ standardHours: nf(v) })} />
              <TextField label="Ignore repeat punches within (seconds)" inputMode="numeric" value={String(draft.duplicatePunchSeconds)} error={errors.duplicatePunchSeconds} disabled={!canEdit} hint="A second punch inside this window is treated as a duplicate." onChange={(v) => set({ duplicatePunchSeconds: nf(v) })} />
              <ToggleRow title="Advanced onboarding" hint="Adds a compliance details step when registering labour." checked={draft.advancedOnboarding} disabled={!canEdit} onChange={(advancedOnboarding) => set({ advancedOnboarding })} />
            </div>
          </Section>
          <Section title="Regularization" description="Manual corrections to attendance. Every change is logged with a reason.">
            <div className="divide-y divide-line">
              <ToggleRow title="Allow regularization" checked={draft.regularization.enabled} disabled={!canEdit} onChange={(enabled) => setReg({ enabled })} />
              <ToggleRow title="Mark out" hint="Add the missing OUT time on a day left open." checked={draft.regularization.allowMarkOut} disabled={!canEdit || !draft.regularization.enabled} onChange={(allowMarkOut) => setReg({ allowMarkOut })} />
              <ToggleRow title="Add attendance" hint="Record a day that has no punches." checked={draft.regularization.allowAddAttendance} disabled={!canEdit || !draft.regularization.enabled} onChange={(allowAddAttendance) => setReg({ allowAddAttendance })} />
              <ToggleRow title="Adjust times" hint="Correct the IN and OUT times of a day." checked={draft.regularization.allowAdjustTimes} disabled={!canEdit || !draft.regularization.enabled} onChange={(allowAdjustTimes) => setReg({ allowAdjustTimes })} />
              <ToggleRow title="Remove a punch" hint="Delete one wrong punch from the punch timeline. The removed punch is kept in the audit log." checked={draft.regularization.allowRemovePunch !== false} disabled={!canEdit || !draft.regularization.enabled} onChange={(allowRemovePunch) => setReg({ allowRemovePunch })} />
              <ToggleRow title="Set hajri" hint="Set a day to ½, 1, 1½ or 2 hajri by hand (hajri-paid labour). The slab table is used again when cleared." checked={draft.regularization.allowSetHajri !== false} disabled={!canEdit || !draft.regularization.enabled} onChange={(allowSetHajri) => setReg({ allowSetHajri })} />
            </div>
            <div className="mt-3">
              <TextField label="How many days back" inputMode="numeric" value={String(draft.regularization.maxBackDays)} error={errors['regularization.maxBackDays']} disabled={!canEdit || !draft.regularization.enabled} hint="Older days cannot be changed." onChange={(v) => setReg({ maxBackDays: nf(v) })} />
            </div>
          </Section>
          <div className="lg:col-span-2">
            <Section title="Hajri" description="How hours worked become day units for labour paid by hajri: ½ (half), 1 (one hajri), 1½ (dedh), 2 (double).">
              <div className="max-w-2xl">
                <HajriSlabs value={draft.hajri?.slabs || DEFAULT_HAJRI_SLABS} error={errors['hajri.slabs']} disabled={!canEdit} onChange={(slabs) => set({ hajri: { slabs } })} />
              </div>
            </Section>
          </div>
          <div className="lg:col-span-2">
            <FormError message={formError} />
            {canEdit && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>
                {scope && overrides.includes(scope) && <button type="button" className={secondaryBtn} onClick={resetOverride}>Use organization default</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
