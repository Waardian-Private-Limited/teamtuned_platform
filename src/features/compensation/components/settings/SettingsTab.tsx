'use client';

import React from 'react';
import { OptionCard, Section, TextField } from '@/components/ui/FormControls';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/compensation.api';
import { invalidateCompensationSettings } from '../../hooks/useCompensationSettings';
import type { CompensationSettings, SettingsResponseDto } from '../../types/compensation.dto';
import { Btn } from '../shared/Buttons';
import { RatingScaleEditor } from './RatingScaleEditor';
import { PayoutTypesEditor } from './PayoutTypesEditor';
import { LettersEditor } from './LettersEditor';

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 hover:bg-bg-subtle/50">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-xs font-semibold text-fg sm:text-sm">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-fg-muted sm:text-xs">{hint}</span>}
      </span>
    </label>
  );
}

const numText = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function SettingsTab({ data, canEdit, onSaved }: { data: SettingsResponseDto; canEdit: boolean; onSaved: () => void }) {
  const [s, setS] = React.useState<CompensationSettings>(data.settings);
  const [error, setError] = React.useState<{ field?: string; message: string } | null>(null);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => setS(data.settings), [data]);

  const patch = <K extends keyof CompensationSettings>(key: K, value: Partial<CompensationSettings[K]>) => setS((prev) => ({ ...prev, [key]: { ...(prev[key] as object), ...value } }));
  const num = (v: string) => (v.trim() === '' ? 0 : Number(v.replace(/[^\d.]/g, '')));
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateSettings(data.sub_organization_id, s);
      invalidateCompensationSettings();
      showSuccess('Compensation settings saved');
      onSaved();
    } catch (e) {
      const field = e instanceof ApiError ? (e.data as { field?: string } | null)?.field : undefined;
      setError({ field, message: messageOf(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto tt-scroll-hidden">
      <fieldset disabled={!canEdit} className="mx-auto max-w-4xl space-y-4 pb-4">
        {data.inherited && data.sub_organization_id && <p className="rounded-lg border border-dashed border-line p-3 text-xs text-fg-muted">This sub-organization uses organization defaults. Saving creates its own settings.</p>}
        <Section title="Approvals" description="Maker-checker for salary changes and payouts">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Toggle checked={s.approval.revisions} onChange={(v) => patch('approval', { revisions: v })} label="Approve salary revisions" hint="Off = revisions apply when submitted" />
            <Toggle checked={s.approval.payouts} onChange={(v) => patch('approval', { payouts: v })} label="Approve payouts" hint="Bonus, incentives, gratuity" />
            <Toggle checked={s.approval.allowSelfApproval} onChange={(v) => patch('approval', { allowSelfApproval: v })} label="Allow self-approval" hint="Off = proposer cannot approve own request" />
          </div>
        </Section>
        <Section title="Arrears" description="What happens when a revision is back-dated or starts mid-month">
          <Toggle checked={s.arrears.enabled} onChange={(v) => patch('arrears', { enabled: v })} label="Pay arrears automatically" hint="Difference for past months is added to the next payroll" />
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <OptionCard selected={s.arrears.midMonth === 'prorate'} onClick={() => patch('arrears', { midMonth: 'prorate' })} title="Prorate mid-month changes" description="New salary from next month, days since the effective date paid as arrears" />
            <OptionCard selected={s.arrears.midMonth === 'next_month'} onClick={() => patch('arrears', { midMonth: 'next_month' })} title="Start from next month" description="Mid-month effective dates start from the 1st of next month" />
          </div>
        </Section>
        <Section title="Gratuity" description="Payment of Gratuity Act, 1972">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <TextField label="Eligible after (years)" value={numText(s.gratuity.eligibilityYears)} onChange={(v) => patch('gratuity', { eligibilityYears: num(v) })} error={err('gratuity.eligibilityYears')} />
            <TextField label="Days rule in last year" value={numText(s.gratuity.continuousServiceDays)} onChange={(v) => patch('gratuity', { continuousServiceDays: v.trim() ? num(v) : null })} hint="240 (190 for 5-day week)" error={err('gratuity.continuousServiceDays')} />
            <TextField label="Divisor" value={numText(s.gratuity.divisor)} onChange={(v) => patch('gratuity', { divisor: num(v) })} hint="26 covered · 30 not covered" error={err('gratuity.divisor')} />
            <TextField label="Round up after (months)" value={numText(s.gratuity.roundUpAfterMonths)} onChange={(v) => patch('gratuity', { roundUpAfterMonths: num(v) })} error={err('gratuity.roundUpAfterMonths')} />
            <TextField label="Maximum (₹)" value={numText(s.gratuity.cap)} onChange={(v) => patch('gratuity', { cap: num(v) })} error={err('gratuity.cap')} />
            <TextField label="Provision % of wage" value={numText(s.gratuity.provisionPercent)} onChange={(v) => patch('gratuity', { provisionPercent: num(v) })} error={err('gratuity.provisionPercent')} />
            <div className="col-span-2">
              <TextField label="Wage components" value={s.gratuity.wageComponents.join(', ')} onChange={(v) => patch('gratuity', { wageComponents: v.split(',').map((x) => x.trim()).filter(Boolean) })} hint="Comma separated. Empty = the Basic component marked in Payroll Setup" error={err('gratuity.wageComponents')} />
            </div>
          </div>
          <div className="mt-3"><Toggle checked={s.gratuity.waiveForDeathDisablement} onChange={(v) => patch('gratuity', { waiveForDeathDisablement: v })} label="Waive service condition on death or disablement" /></div>
        </Section>
        <Section title="Statutory bonus" description="Payment of Bonus Act, 1965">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <TextField label="Rate (8.33–20%)" value={numText(s.statutoryBonus.rate)} onChange={(v) => patch('statutoryBonus', { rate: num(v) })} error={err('statutoryBonus.rate')} />
            <TextField label="Eligible up to wage (₹)" value={numText(s.statutoryBonus.eligibilityWage)} onChange={(v) => patch('statutoryBonus', { eligibilityWage: num(v) })} error={err('statutoryBonus.eligibilityWage')} />
            <TextField label="Calculation ceiling (₹)" value={numText(s.statutoryBonus.calculationCeiling)} onChange={(v) => patch('statutoryBonus', { calculationCeiling: num(v) })} hint="₹7,000 or state minimum wage" error={err('statutoryBonus.calculationCeiling')} />
            <TextField label="Min. working days" value={numText(s.statutoryBonus.minWorkingDays)} onChange={(v) => patch('statutoryBonus', { minWorkingDays: num(v) })} error={err('statutoryBonus.minWorkingDays')} />
            <div className="col-span-2 sm:col-span-4">
              <TextField label="Wage components" value={s.statutoryBonus.wageComponents.join(', ')} onChange={(v) => patch('statutoryBonus', { wageComponents: v.split(',').map((x) => x.trim()).filter(Boolean) })} hint="Comma separated. Empty = the Basic component marked in Payroll Setup" error={err('statutoryBonus.wageComponents')} />
            </div>
          </div>
        </Section>
        <Section title="Payout types" description="Bonus and one-time payment types your company uses">
          <PayoutTypesEditor value={s.payoutTypes} onChange={(v) => setS((prev) => ({ ...prev, payoutTypes: v }))} error={err('payoutTypes')} />
        </Section>
        <Section title="Increment and promotion letters" description="Printed from Increments & Promotions once a revision is approved">
          <LettersEditor value={s.letters} onChange={(v) => setS((prev) => ({ ...prev, letters: v }))} placeholders={data.catalog.letter_placeholders} error={err} />
        </Section>
        <Section title="Appraisal rating guide" description="Default increment per rating for new appraisal cycles">
          <RatingScaleEditor value={s.ratingScale} onChange={(v) => setS((prev) => ({ ...prev, ratingScale: v }))} error={err('ratingScale')} />
        </Section>
        {error && !error.field && <p className="text-xs font-medium text-[var(--tt-danger)]">{error.message}</p>}
        {canEdit && (
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setS(data.defaults)}>Reset to defaults</Btn>
            <Btn variant="primary" busy={saving} onClick={save}>Save settings</Btn>
          </div>
        )}
      </fieldset>
    </div>
  );
}
