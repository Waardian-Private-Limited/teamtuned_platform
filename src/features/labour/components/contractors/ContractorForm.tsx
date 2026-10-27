'use client';

import React, { useState } from 'react';

import { useLabourSites } from '../../hooks/useLabourLists';
import { Textarea } from '@/components/ui/Textarea';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { Contractor } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { FormError } from '../shared/Primitives';
import { Section, TextField } from '@/components/ui/FormControls';
import { SiteMultiSelect } from '../shared/FormBits';
import { primaryBtn } from '../shared/Primitives';

const TEXT_KEYS = ['legalName', 'tradeName', 'code', 'contactPerson', 'phone', 'email', 'gstin', 'pan', 'clraLicenceNo', 'clraValidFrom', 'clraValidTo', 'clraMaxWorkers', 'pfCode', 'esicCode', 'bocwRegNo', 'notes'] as const;
const ADDR_KEYS = ['line1', 'line2', 'city', 'state', 'pincode'] as const;
const BANK_KEYS = ['accountName', 'accountNo', 'ifsc', 'bankName'] as const;

type FormState = Record<string, string>;

function initial(c: Contractor | null): FormState {
  const s: FormState = {};
  TEXT_KEYS.forEach((k) => { const v = c?.[k]; s[k] = v === null || v === undefined ? '' : String(v); });
  ADDR_KEYS.forEach((k) => { s[`address.${k}`] = c?.address?.[k] || ''; });
  BANK_KEYS.forEach((k) => { s[`bank.${k}`] = ''; });
  return s;
}

function validate(s: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!s.legalName.trim()) e.legalName = 'Enter the contractor’s legal name';
  if (s.email && !/^\S+@\S+\.\S+$/.test(s.email)) e.email = 'Enter a valid email address';
  if (s.phone && !/^\d{10}$/.test(s.phone)) e.phone = 'Enter a 10 digit mobile number';
  if (s.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i.test(s.gstin)) e.gstin = 'GSTIN should be 15 characters, like 27ABCDE1234F1Z5';
  if (s.pan && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(s.pan)) e.pan = 'PAN should look like ABCDE1234F';
  if (s['address.pincode'] && !/^\d{6}$/.test(s['address.pincode'])) e['address.pincode'] = 'Pincode is 6 digits';
  if (s['bank.ifsc'] && !/^[A-Z]{4}0[A-Z\d]{6}$/i.test(s['bank.ifsc'])) e['bank.ifsc'] = 'IFSC should look like HDFC0001234';
  if (s.clraMaxWorkers && !/^\d+$/.test(s.clraMaxWorkers)) e.clraMaxWorkers = 'Enter a whole number';
  if (s.clraValidFrom && s.clraValidTo && s.clraValidTo < s.clraValidFrom) e.clraValidTo = 'Valid-to date is before valid-from';
  return e;
}

function body(s: FormState, siteIds: number[]) {
  const o: Record<string, unknown> = {};
  TEXT_KEYS.forEach((k) => { o[k] = s[k].trim() === '' ? null : k === 'clraMaxWorkers' ? Number(s[k]) : s[k].trim(); });
  o.legalName = s.legalName.trim();
  o.address = Object.fromEntries(ADDR_KEYS.map((k) => [k, s[`address.${k}`].trim() || null]));
  if (BANK_KEYS.some((k) => s[`bank.${k}`].trim())) o.bank = Object.fromEntries(BANK_KEYS.map((k) => [k, s[`bank.${k}`].trim()]));
  o.siteIds = siteIds;
  return o;
}

export function ContractorForm({ contractor, onSaved }: { contractor: Contractor | null; onSaved: (id: number) => void }) {
  const { sites } = useLabourSites();
  const [s, setS] = useState<FormState>(() => initial(contractor));
  const [siteIds, setSiteIds] = useState<number[]>(contractor?.siteIds || []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const f = (key: string, label: string, extra: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <TextField label={label} value={s[key]} error={errors[key]} onChange={(v) => { setS((p) => ({ ...p, [key]: v })); setErrors((e) => (e[key] ? { ...e, [key]: '' } : e)); }} {...extra} />
  );

  const save = async () => {
    const errs = validate(s);
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const r = await api.saveContractor(contractor?.id ?? null, body(s, siteIds));
      showSuccess(contractor ? 'Contractor saved' : 'Contractor added');
      onSaved(contractor?.id ?? r.id);
    } catch (err) {
      const p = placeError(err, (k) => k in s || k === 'siteIds');
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  const g = 'grid gap-4 sm:grid-cols-2';
  return (
    <div className="space-y-4">
      <Section title="Company">
        <div className={g}>
          {f('legalName', 'Legal name', { required: true })}
          {f('tradeName', 'Trade name')}
          {f('code', 'Contractor code', { hint: 'Leave blank to generate one.' })}
          {f('contactPerson', 'Contact person')}
          {f('phone', 'Mobile', { inputMode: 'numeric', maxLength: 10 })}
          {f('email', 'Email', { type: 'email' })}
          {f('gstin', 'GSTIN', { maxLength: 15 })}
          {f('pan', 'PAN', { maxLength: 10 })}
        </div>
      </Section>
      <Section title="Address">
        <div className={g}>
          <div className="sm:col-span-2">{f('address.line1', 'Address line 1')}</div>
          <div className="sm:col-span-2">{f('address.line2', 'Address line 2')}</div>
          {f('address.city', 'City')}{f('address.state', 'State')}{f('address.pincode', 'Pincode', { inputMode: 'numeric', maxLength: 6 })}
        </div>
      </Section>
      <Section title="Licence and registrations" description="CLRA licence, provident fund, ESIC and construction worker registrations.">
        <div className={g}>
          {f('clraLicenceNo', 'CLRA licence number')}
          {f('clraMaxWorkers', 'Max workers on licence', { inputMode: 'numeric' })}
          {f('clraValidFrom', 'Licence valid from', { type: 'date' })}
          {f('clraValidTo', 'Licence valid to', { type: 'date' })}
          {f('pfCode', 'PF code')}{f('esicCode', 'ESIC code')}{f('bocwRegNo', 'BOCW registration number')}
        </div>
      </Section>
      <Section title="Bank account" description={contractor ? 'Stored encrypted and never shown again. Leave blank to keep the saved account.' : 'Stored encrypted.'}>
        <div className={g}>
          {f('bank.accountName', 'Account holder')}{f('bank.accountNo', 'Account number', { inputMode: 'numeric', autoComplete: 'off' })}
          {f('bank.ifsc', 'IFSC', { maxLength: 11 })}{f('bank.bankName', 'Bank name')}
        </div>
      </Section>
      <Section title="Sites" description="Sites this contractor works at.">
        <SiteMultiSelect options={sites} value={siteIds} onChange={setSiteIds} error={errors.siteIds} />
      </Section>
      <Textarea label="Notes" value={s.notes} error={errors.notes} onChange={(e) => setS((p) => ({ ...p, notes: e.target.value }))} />
      <FormError message={formError} />
      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:px-6">
        <button type="button" disabled={busy} onClick={save} className={primaryBtn}>{busy ? 'Saving…' : contractor ? 'Save changes' : 'Add contractor'}</button>
      </div>
    </div>
  );
}
