'use client';

import React from 'react';
import { FileText, Upload } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Chip, OptionCard, SelectField, TextField, Section } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/insurance.api';
import { EMPTY_PLAN, MAX_INSTALLMENTS, RECOVERY_OPTIONS, TYPE_OPTIONS } from '../../constants/insurance.constants';
import { useOpenFile } from '../../hooks/useOpenFile';
import type { Plan, PlanBody, PlanType, RecoveryMode } from '../../types/insurance.types';
import { formErrors } from '../../utils/errors';
import { MONTH_NAMES, parseAmount } from '../../utils/format';

interface PlanDrawerProps {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
  onSaved: (plan: Plan) => void;
}

function toBody(plan: Plan): PlanBody {
  return {
    name: plan.name, type: plan.type, insurer: plan.insurer, policy_number: plan.policy_number ?? '', tpa: plan.tpa ?? '',
    start_date: plan.start_date, end_date: plan.end_date, sum_insured: plan.sum_insured, covers: plan.covers, premium: plan.premium,
    recovery: plan.recovery, notes: plan.notes ?? '', sub_organization_id: plan.sub_organization_id,
  };
}

export function PlanDrawer({ open, plan, onClose, onSaved }: PlanDrawerProps) {
  const [form, setForm] = React.useState<PlanBody>(EMPTY_PLAN);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [hasDocument, setHasDocument] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { subOrgs } = useManageableSubOrgs();
  const files = useOpenFile();
  const locked = Boolean(plan && plan.employees > 0);

  React.useEffect(() => {
    if (!open) return;
    setForm(plan ? toBody(plan) : EMPTY_PLAN);
    setHasDocument(Boolean(plan?.has_document));
    setErrors({});
    setFormError('');
  }, [open, plan]);

  const set = <K extends keyof PlanBody>(key: K, value: PlanBody[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: '' } : e));
  };
  const clear = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError('');
    try {
      const saved = plan ? await api.updatePlan(plan.id, form) : await api.createPlan(form);
      showSuccess(plan ? 'Plan saved' : 'Plan created');
      onSaved(saved);
    } catch (err) {
      const { fields, form: message } = formErrors(err);
      setErrors(fields);
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file || !plan) return;
    setUploading(true);
    try {
      await api.uploadPlanDocument(plan.id, file);
      setHasDocument(true);
      showSuccess('Policy document uploaded');
    } catch (err) {
      setFormError(formErrors(err).form || formErrors(err).fields.file || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const mode = form.recovery.mode;
  const covers = form.covers;
  const lockedNote = locked ? 'Locked while employees are covered. Renew the plan to change this.' : undefined;

  return (
    <Drawer open={open} onClose={onClose} title={plan ? 'Edit plan' : 'New plan'} maxWidthClassName="sm:max-w-2xl">
      <form onSubmit={submit} noValidate className="flex min-h-full flex-col gap-4">
        {locked && <p className="rounded-lg border border-line bg-bg-subtle px-3 py-2 text-xs text-fg-muted">{lockedNote}</p>}

        <Section title="Plan">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Plan name" required value={form.name} onChange={(v) => set('name', v)} error={errors.name} placeholder="Group health 2026-27" />
            <SelectField<PlanType> label="Type" required value={form.type} onChange={(v) => v && set('type', v)} options={TYPE_OPTIONS} disabled={locked} error={errors.type} />
            <TextField label="Insurer" required value={form.insurer} onChange={(v) => set('insurer', v)} error={errors.insurer} />
            <TextField label="Policy number" value={form.policy_number} onChange={(v) => set('policy_number', v)} error={errors.policy_number} />
            <TextField label="TPA" value={form.tpa} onChange={(v) => set('tpa', v)} error={errors.tpa} />
            {!plan && subOrgs.length > 0 && (
              <SelectField<number>
                label="Company"
                numeric
                value={form.sub_organization_id ?? null}
                onChange={(v) => set('sub_organization_id', v)}
                options={subOrgs.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="All companies"
                error={errors.sub_organization_id}
                hint="Leave empty for every company"
              />
            )}
            <TextField label="Starts" required type="date" value={form.start_date} onChange={(v) => set('start_date', v)} disabled={locked} error={errors.start_date} />
            <TextField label="Ends" required type="date" value={form.end_date} onChange={(v) => set('end_date', v)} disabled={locked} error={errors.end_date} />
            <TextField
              label="Sum insured"
              required
              inputMode="decimal"
              prefix="₹"
              value={form.sum_insured === '' ? '' : String(form.sum_insured)}
              onChange={(v) => set('sum_insured', v === '' ? '' : Number(parseAmount(v)))}
              disabled={locked}
              error={errors.sum_insured}
            />
          </div>
        </Section>

        <Section title="Who is covered" description="The employee is always covered. Choose which family members can be added.">
          <div className="flex flex-wrap gap-2">
            <Chip active={covers.spouse} disabled={locked} onClick={() => set('covers', { ...covers, spouse: !covers.spouse })}>Spouse</Chip>
            <Chip active={covers.children} disabled={locked} onClick={() => set('covers', { ...covers, children: !covers.children })}>Children</Chip>
            <Chip active={covers.parents} disabled={locked} onClick={() => set('covers', { ...covers, parents: !covers.parents })}>Parents</Chip>
            <Chip active={covers.parentsInLaw} disabled={locked} onClick={() => set('covers', { ...covers, parentsInLaw: !covers.parentsInLaw })}>Parents-in-law</Chip>
          </div>
          {covers.children && (
            <div className="mt-3 max-w-[12rem]">
              <TextField
                label="Most children"
                inputMode="numeric"
                value={String(covers.maxChildren)}
                onChange={(v) => set('covers', { ...covers, maxChildren: Math.min(10, Number(v.replace(/\D/g, '')) || 0) })}
                disabled={locked}
                hint="0 means no limit"
              />
            </div>
          )}
        </Section>

        <Section title="Premium" description="What one employee’s cover costs each year.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <OptionCard selected={form.premium.basis === 'per_employee'} disabled={locked} onClick={() => set('premium', { ...form.premium, basis: 'per_employee' })} title="Per employee" description="One amount, family included" />
            <OptionCard selected={form.premium.basis === 'per_member'} disabled={locked} onClick={() => set('premium', { ...form.premium, basis: 'per_member' })} title="Per covered person" description="Amount × employee and family" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label={form.premium.basis === 'per_member' ? 'Yearly premium per person' : 'Yearly premium'}
              required
              inputMode="decimal"
              prefix="₹"
              value={form.premium.amount ? String(form.premium.amount) : ''}
              onChange={(v) => { set('premium', { ...form.premium, amount: Number(parseAmount(v)) || 0 }); clear('premium.amount'); }}
              disabled={locked}
              error={errors['premium.amount']}
            />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <TextField
                label="Company pays"
                required
                inputMode="decimal"
                prefix={form.premium.employer.type === 'fixed' ? '₹' : undefined}
                suffix={form.premium.employer.type === 'percent' ? <span className="text-xs font-semibold text-fg-muted">%</span> : undefined}
                value={String(form.premium.employer.value)}
                onChange={(v) => { set('premium', { ...form.premium, employer: { ...form.premium.employer, value: Number(parseAmount(v)) || 0 } }); clear('premium.employer.value'); }}
                disabled={locked}
                error={errors['premium.employer.value']}
              />
              <div className="flex items-end gap-1">
                <Chip active={form.premium.employer.type === 'percent'} disabled={locked} onClick={() => set('premium', { ...form.premium, employer: { ...form.premium.employer, type: 'percent' } })}>%</Chip>
                <Chip active={form.premium.employer.type === 'fixed'} disabled={locked} onClick={() => set('premium', { ...form.premium, employer: { ...form.premium.employer, type: 'fixed' } })}>₹</Chip>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Employee share" description="Recovered from salary in payroll. Anything the company does not pay is the employee’s share.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {RECOVERY_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={mode === o.value}
                disabled={locked}
                onClick={() => { set('recovery', { ...form.recovery, mode: o.value as RecoveryMode }); clear('recovery.mode'); }}
                title={o.label}
                description={o.description}
              />
            ))}
          </div>
          {mode === 'installments' && (
            <div className="mt-3 max-w-[12rem]">
              <TextField
                label="Installments"
                inputMode="numeric"
                value={String(form.recovery.installments)}
                onChange={(v) => { set('recovery', { ...form.recovery, installments: Math.min(MAX_INSTALLMENTS, Number(v.replace(/\D/g, '')) || 1) }); clear('recovery.installments'); }}
                disabled={locked}
                error={errors['recovery.installments']}
                hint={`Up to ${MAX_INSTALLMENTS}`}
              />
            </div>
          )}
          {(mode === 'monthly' || mode === 'installments') && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">Deduct in</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <OptionCard
                  selected={form.recovery.calendarMonths.length === 0}
                  disabled={locked}
                  onClick={() => { set('recovery', { ...form.recovery, calendarMonths: [] }); clear('recovery.calendarMonths'); }}
                  title="Continuous"
                  description={mode === 'monthly' ? 'Every month of the cover' : 'Months one after another from the start'}
                />
                <OptionCard
                  selected={form.recovery.calendarMonths.length > 0}
                  disabled={locked}
                  onClick={() => { if (!form.recovery.calendarMonths.length) set('recovery', { ...form.recovery, calendarMonths: [3, 6, 9, 12] }); }}
                  title="Specific months"
                  description="Only the months you pick, for example quarterly"
                />
              </div>
              {form.recovery.calendarMonths.length > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {MONTH_NAMES.map((label, i) => {
                      const n = i + 1;
                      const on = form.recovery.calendarMonths.includes(n);
                      return (
                        <Chip
                          key={n}
                          active={on}
                          disabled={locked}
                          onClick={() => {
                            const next = on ? form.recovery.calendarMonths.filter((x) => x !== n) : [...form.recovery.calendarMonths, n].sort((a, b) => a - b);
                            set('recovery', { ...form.recovery, calendarMonths: next });
                            clear('recovery.calendarMonths');
                          }}
                        >
                          {label}
                        </Chip>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-fg-muted">
                    {mode === 'installments'
                      ? 'The installments are taken in the first of these months from the cover start, up to the cover end.'
                      : 'The share is split across these months until the cover ends.'}
                  </p>
                </div>
              )}
            </div>
          )}
          {mode !== 'none' && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-fg sm:text-sm">Recover the rest when someone leaves</p>
                <p className="text-[11px] text-fg-muted sm:text-xs">Deducts every remaining month from the final payroll.</p>
              </div>
              <Switch checked={form.recovery.recoverOnExit} disabled={locked} onChange={(v) => set('recovery', { ...form.recovery, recoverOnExit: v })} label="Recover on exit" />
            </div>
          )}
        </Section>

        <Textarea label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} maxLength={1000} error={errors.notes} />

        {plan && (
          <Section title="Policy document" description="Employees can open it from My insurance. PDF, JPG or PNG up to 5 MB.">
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={(e) => upload(e.target.files?.[0])} />
              <Btn onClick={() => fileRef.current?.click()} busy={uploading} icon={<Upload className="h-3.5 w-3.5" />}>{hasDocument ? 'Replace' : 'Upload'}</Btn>
              {hasDocument && (
                <Btn onClick={() => files.open('doc', () => api.planDocumentLink(plan.id))} busy={files.busy === 'doc'} icon={<FileText className="h-3.5 w-3.5" />}>View</Btn>
              )}
            </div>
          </Section>
        )}

        {formError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{formError}</p>}

        <div className="mt-auto flex justify-end gap-2.5 border-t border-line pt-4">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn type="submit" variant="primary" busy={saving}>{plan ? 'Save plan' : 'Create plan'}</Btn>
        </div>
      </form>
    </Drawer>
  );
}
