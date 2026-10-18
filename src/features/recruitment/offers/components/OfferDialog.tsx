'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { addDays, orgToday, useOrgTimezone } from '@/lib/datetime';
import { showError, showSuccess } from '@/lib/toast';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { useRecruitmentOptions } from '../../shared/hooks/useRecruitmentOptions';
import { getPosition } from '../../interviews/api/interviews.api';
import { btn, fieldOf, INR } from '../../interviews/lib/ui';
import * as api from '../api/offers.api';
import type { OfferBody, OfferDetailDto } from '../types/offers.dto';
import { OFFER_FIELD_MAP } from '../constants/offers.constants';

/** Job terms a new draft starts from (usually the position's). */
export interface OfferDefaults {
  designation?: string | null;
  departmentId?: number | null;
  roleId?: number | null;
  employmentTypeId?: number | null;
  siteId?: number | null;
  subOrganizationId?: number | null;
}

export interface OfferDialogProps {
  open: boolean;
  onClose: () => void;
  applicationId: number;
  /** Edit this draft/approved offer instead of creating one. */
  offer?: (Partial<OfferDetailDto> & { id: number }) | null;
  candidateName?: string;
  /** Prefill for a new draft; when omitted and `positionId` is given the position's terms are fetched. */
  defaults?: OfferDefaults | null;
  positionId?: number | null;
  onDone?: (offer?: OfferDetailDto) => void;
}

type Field = 'designation' | 'departmentId' | 'roleId' | 'employmentTypeId' | 'siteId' | 'subOrganizationId' | 'joiningDate' | 'annualCtc' | 'probationMonths' | 'noticePeriodDays' | 'expiresOn' | 'notes';

interface FormState {
  designation: string;
  departmentId: number | null;
  roleId: number | null;
  employmentTypeId: number | null;
  siteId: number | null;
  subOrganizationId: number | null;
  joiningDate: string;
  annualCtc: string; // digits only
  probationMonths: string;
  noticePeriodDays: string;
  expiresOn: string;
  notes: string;
}

const digits = (v: string) => v.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
const idOf = (v: { id: number } | null | undefined, fallback?: number | null) => fallback ?? v?.id ?? null;

export function OfferDialog({ open, onClose, applicationId, offer, candidateName, defaults, positionId, onDone }: OfferDialogProps) {
  const tz = useOrgTimezone();
  const { options } = useRecruitmentOptions();
  const { subOrgs } = useManageableSubOrgs();
  const [form, setForm] = useState<FormState>(() => blank(tz));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(offer?.id);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (offer?.id) {
      setForm({
        designation: offer.designation || '',
        departmentId: idOf(offer.department, offer.departmentId),
        roleId: idOf(offer.role, offer.roleId),
        employmentTypeId: idOf(offer.employmentType, offer.employmentTypeId),
        siteId: idOf(offer.site, offer.siteId),
        subOrganizationId: idOf(offer.subOrganization, offer.subOrganizationId),
        joiningDate: offer.joiningDate?.slice(0, 10) || '',
        annualCtc: offer.annualCtc !== null && offer.annualCtc !== undefined ? digits(String(Math.round(Number(offer.annualCtc)))) : '',
        probationMonths: offer.probationMonths !== null && offer.probationMonths !== undefined ? String(offer.probationMonths) : '',
        noticePeriodDays: offer.noticePeriodDays !== null && offer.noticePeriodDays !== undefined ? String(offer.noticePeriodDays) : '',
        expiresOn: offer.expiresOn?.slice(0, 10) || '',
        notes: offer.notes || '',
      });
      return;
    }
    const base = blank(tz);
    if (defaults) { setForm(applyDefaults(base, defaults)); return; }
    setForm(base);
    if (!positionId) return;
    let alive = true;
    getPosition(positionId)
      .then((p) => {
        if (!alive) return;
        const ref = (r: unknown) => (r && typeof r === 'object' && 'id' in r ? Number((r as { id: number }).id) || null : null);
        setForm((f) => applyDefaults(f, {
          designation: p.title,
          departmentId: p.departmentId ?? ref(p.department),
          roleId: p.roleId ?? ref(p.role),
          employmentTypeId: p.employmentTypeId ?? ref(p.employmentType),
          siteId: p.siteId ?? ref(p.site),
          subOrganizationId: p.subOrganizationId ?? null,
        }));
      })
      .catch(() => {});
    return () => { alive = false; };
    // Re-run per open / offer, not per object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offer?.id, positionId, tz]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const roleOptions = useMemo(
    () => options.roles
      .filter((r) => r.id !== null && (!form.departmentId || !r.departmentId || r.departmentId === form.departmentId))
      .map((r) => ({ value: r.id as number, label: r.name })),
    [options.roles, form.departmentId]
  );
  const opt = (list: Array<{ id: number | null; name: string }>) => list.filter((x) => x.id !== null).map((x) => ({ value: x.id as number, label: x.name }));

  const ctc = Number(form.annualCtc || 0);

  function validate(): OfferBody | null {
    const e: Partial<Record<Field, string>> = {};
    if (!form.designation.trim()) e.designation = 'Enter the designation';
    if (!form.joiningDate) e.joiningDate = 'Pick the joining date';
    if (!ctc || ctc <= 0) e.annualCtc = 'Enter the annual CTC';
    const prob = form.probationMonths === '' ? null : Number(form.probationMonths);
    if (prob !== null && (!Number.isInteger(prob) || prob < 0 || prob > 24)) e.probationMonths = '0 to 24 months';
    const notice = form.noticePeriodDays === '' ? null : Number(form.noticePeriodDays);
    if (notice !== null && (!Number.isInteger(notice) || notice < 0 || notice > 365)) e.noticePeriodDays = '0 to 365 days';
    if (form.expiresOn && form.expiresOn < orgToday(tz)) e.expiresOn = 'Must be today or later';
    if (subOrgs.length > 1 && !form.subOrganizationId) e.subOrganizationId = 'Choose the company';
    setErrors(e);
    if (Object.keys(e).length) return null;
    return {
      designation: form.designation.trim(),
      department_id: form.departmentId,
      role_id: form.roleId,
      employment_type_id: form.employmentTypeId,
      site_id: form.siteId,
      sub_organization_id: subOrgs.length === 1 ? subOrgs[0].id : form.subOrganizationId,
      joining_date: form.joiningDate,
      annual_ctc: ctc,
      probation_months: prob,
      notice_period_days: notice,
      expires_on: form.expiresOn || null,
      notes: form.notes.trim(),
    };
  }

  async function submit() {
    const body = validate();
    if (!body) return;
    setSaving(true);
    try {
      const res = offer?.id ? await api.updateOffer(offer.id, body) : await api.createOffer(applicationId, body);
      showSuccess(isEdit ? 'Offer updated' : res?.status === 'approved' ? 'Offer created. Download or email the letter when ready.' : 'Offer created as a draft. Submit it for approval.');
      onDone?.(res);
      onClose();
    } catch (err) {
      const f = fieldOf(err);
      const key = f ? (OFFER_FIELD_MAP[f] as Field | undefined) : undefined;
      if (key) setErrors({ [key]: messageOf(err) });
      else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      title={
        <div>
          <h2 className="text-base font-semibold text-fg sm:text-lg">{isEdit ? 'Edit offer' : 'Create offer'}</h2>
          {candidateName && <p className="text-xs text-fg-muted">{candidateName}</p>}
        </div>
      }
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className={btn.primary}>
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {isEdit ? 'Save offer' : 'Create offer'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Group title="Role">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField label="Designation" required value={form.designation} onChange={(v) => set('designation', v)} error={errors.designation} maxLength={160} placeholder="e.g. Senior Accountant" />
            </div>
            <SelectField<number> label="Department" numeric value={form.departmentId} options={opt(options.departments)} onChange={(v) => { set('departmentId', v); set('roleId', null); }} error={errors.departmentId} placeholder="Not set" />
            <SelectField<number> label="Role" numeric value={form.roleId} options={roleOptions} onChange={(v) => set('roleId', v)} error={errors.roleId} placeholder="Not set" hint="Grants the new employee this role's permissions." />
            <SelectField<number> label="Employment type" numeric value={form.employmentTypeId} options={opt(options.employmentTypes)} onChange={(v) => set('employmentTypeId', v)} error={errors.employmentTypeId} placeholder="Not set" />
            <SelectField<number> label="Site" numeric value={form.siteId} options={opt(options.sites)} onChange={(v) => set('siteId', v)} error={errors.siteId} placeholder="Not set" />
            {subOrgs.length > 1 && (
              <div className="sm:col-span-2">
                <SelectField<number>
                  label="Company (sub-organization)"
                  required
                  numeric
                  value={form.subOrganizationId}
                  options={subOrgs.map((s) => ({ value: s.id, label: s.name }))}
                  onChange={(v) => set('subOrganizationId', v)}
                  error={errors.subOrganizationId}
                  hint="The employer named on the letter and payroll."
                />
              </div>
            )}
          </div>
        </Group>

        <Group title="Pay & dates">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Annual CTC"
              required
              prefix="₹"
              inputMode="numeric"
              value={form.annualCtc ? INR.format(Number(form.annualCtc)) : ''}
              onChange={(v) => set('annualCtc', digits(v).slice(0, 12))}
              error={errors.annualCtc}
              placeholder="0"
              hint={ctc > 0 ? `≈ ₹${INR.format(Math.round(ctc / 12))} per month` : undefined}
            />
            <TextField label="Joining date" type="date" required value={form.joiningDate} onChange={(v) => set('joiningDate', v)} error={errors.joiningDate} min={orgToday(tz)} />
            <TextField label="Probation" inputMode="numeric" suffix={<span className="text-xs text-fg-muted">months</span>} value={form.probationMonths} onChange={(v) => set('probationMonths', digits(v).slice(0, 2))} error={errors.probationMonths} placeholder="e.g. 6" />
            <TextField label="Notice period" inputMode="numeric" suffix={<span className="text-xs text-fg-muted">days</span>} value={form.noticePeriodDays} onChange={(v) => set('noticePeriodDays', digits(v).slice(0, 3))} error={errors.noticePeriodDays} placeholder="e.g. 30" />
            <TextField label="Offer expires on" type="date" value={form.expiresOn} onChange={(v) => set('expiresOn', v)} error={errors.expiresOn} hint="After this date the candidate can no longer accept." min={orgToday(tz)} />
          </div>
        </Group>

        <Textarea label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} error={errors.notes} rows={3} placeholder="Shown on the offer letter, e.g. joining bonus, reporting location" />
      </div>
    </Dialog>
  );
}

function blank(tz: string): FormState {
  return {
    designation: '',
    departmentId: null,
    roleId: null,
    employmentTypeId: null,
    siteId: null,
    subOrganizationId: null,
    joiningDate: '',
    annualCtc: '',
    probationMonths: '',
    noticePeriodDays: '',
    expiresOn: addDays(orgToday(tz), 7),
    notes: '',
  };
}

function applyDefaults(f: FormState, d: OfferDefaults): FormState {
  return {
    ...f,
    designation: f.designation || d.designation || '',
    departmentId: f.departmentId ?? d.departmentId ?? null,
    roleId: f.roleId ?? d.roleId ?? null,
    employmentTypeId: f.employmentTypeId ?? d.employmentTypeId ?? null,
    siteId: f.siteId ?? d.siteId ?? null,
    subOrganizationId: f.subOrganizationId ?? d.subOrganizationId ?? null,
  };
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{title}</h3>
      {children}
    </section>
  );
}
