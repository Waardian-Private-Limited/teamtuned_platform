'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { FACE_POSES, GENDERS, LABOURER_DOC_TYPES } from '../../../constants/labour.constants';
import type { Opt } from '../../../hooks/useLabourLists';
import type { Address, Category, CompliancePack } from '../../../types/labour.types';
import { daysAgo, today } from '../../../utils/format';
import { getOfficers } from '../../../api/labour.api';
import type { Officer } from '../../../types/labour.types';
import { secondaryBtn } from '../../shared/Primitives';
import { FaceCapture, type Shots } from './FaceCapture';
import type { PendingDoc, WizardForm } from './wizard.types';

export type Errors = Record<string, string>;
interface StepProps { form: WizardForm; set: (patch: Partial<WizardForm>) => void; errors: Errors; clear: (k: string) => void }

const grid = 'grid gap-4 sm:grid-cols-2';

/** `move`: editing changed the site / contractor / category; offers to move recent attendance along (within maxBackDays). */
/** `payHint`: the pay rate suggestion card, shown under the fields once contractor and site are chosen. */
export function BasicStep({ form, set, errors, clear, sites, contractors, categories, lockContractor, move, payHint }: StepProps & { sites: Opt[]; contractors: Opt[]; categories: Category[]; lockContractor?: boolean; move?: { maxBackDays: number } | null; payHint?: React.ReactNode }) {
  const subs = (categories.find((c) => c.id === form.categoryId)?.subcategories || []).filter((s) => s.isActive);
  const text = (k: keyof WizardForm, label: string, extra: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <TextField label={label} value={String(form[k] ?? '')} error={errors[k as string]} onChange={(v) => { set({ [k]: v } as Partial<WizardForm>); clear(k as string); }} {...extra} />
  );
  return (
    <div className="space-y-4">
      <div className={grid}>
        <SelectField label="Contractor" required numeric value={form.contractorId} options={contractors} error={errors.contractorId} disabled={lockContractor} onChange={(v) => { set({ contractorId: v }); clear('contractorId'); }} />
        <SelectField label="Site" required numeric value={form.siteId} options={sites} error={errors.siteId} onChange={(v) => { set({ siteId: v }); clear('siteId'); }} />
      </div>
      <div className={grid}>
        {text('firstName', 'First name', { required: true, autoComplete: 'off' })}
        {text('lastName', 'Last name')}
        {text('guardianName', 'Father / guardian name')}
        <SelectField label="Gender" value={form.gender} options={GENDERS} error={errors.gender} onChange={(v) => set({ gender: v })} />
        {text('dob', 'Date of birth', { type: 'date' })}
        {text('workStartDate', 'Work start date', { type: 'date' })}
        {text('phone', 'Mobile number', { inputMode: 'numeric', maxLength: 10 })}
        {text('emergencyPhone', 'Emergency number', { inputMode: 'numeric', maxLength: 10 })}
        <SelectField label="Category" numeric value={form.categoryId} options={categories.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))} error={errors.categoryId} onChange={(v) => set({ categoryId: v, subcategoryId: null })} />
        <SelectField label="Subcategory" numeric value={form.subcategoryId} disabled={!form.categoryId} options={subs.map((s) => ({ value: s.id, label: s.name }))} error={errors.subcategoryId} onChange={(v) => set({ subcategoryId: v })} />
      </div>
      {payHint}
      {move && (
        <section className="space-y-3 rounded-xl border border-line p-4">
          <div>
            <h4 className="text-sm font-bold text-fg">Move past attendance too?</h4>
            <p className="text-xs text-fg-muted">Optional. Attendance days from this date are moved to the new site, contractor and category (up to {move.maxBackDays} days back). Leave it empty to change only from now on.</p>
          </div>
          <div className={grid}>
            {text('moveFrom', 'Also apply to attendance from', { type: 'date', min: daysAgo(move.maxBackDays), max: today() })}
            {text('moveReason', 'Reason', { maxLength: 255, disabled: !form.moveFrom })}
          </div>
        </section>
      )}
    </div>
  );
}

function AddressFields({ prefix, value, onChange, errors, clear }: { prefix: 'present' | 'permanent'; value: Address; onChange: (a: Address) => void; errors: Errors; clear: (k: string) => void }) {
  const f = (k: keyof Address, label: string, extra: Partial<React.ComponentProps<typeof TextField>> = {}) => {
    const key = `addresses.${prefix}.${k}`;
    return <TextField label={label} value={value[k]} error={errors[key]} onChange={(v) => { onChange({ ...value, [k]: v }); clear(key); }} {...extra} />;
  };
  return (
    <div className={grid}>
      <div className="sm:col-span-2">{f('line1', 'Address line 1')}</div>
      <div className="sm:col-span-2">{f('line2', 'Address line 2')}</div>
      {f('city', 'City / village')}
      {f('state', 'State')}
      {f('pincode', 'Pincode', { inputMode: 'numeric', maxLength: 6 })}
    </div>
  );
}

export function AddressStep({ form, set, errors, clear }: StepProps) {
  return (
    <div className="space-y-5">
      <section>
        <h4 className="mb-3 text-sm font-bold text-fg">Present address</h4>
        <AddressFields prefix="present" value={form.present} onChange={(present) => set({ present })} errors={errors} clear={clear} />
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-fg">Permanent address</h4>
          <label className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
            Same as present
            <Switch label="Permanent address same as present" checked={form.sameAddress} onChange={(sameAddress) => set({ sameAddress })} />
          </label>
        </div>
        {!form.sameAddress && <AddressFields prefix="permanent" value={form.permanent} onChange={(permanent) => set({ permanent })} errors={errors} clear={clear} />}
      </section>
    </div>
  );
}

export function IdentityStep({ form, set, errors, clear, editing, masked, onOpenExisting, existingId }: StepProps & { editing: boolean; masked?: string | null; onOpenExisting?: (id: number) => void; existingId?: number | null }) {
  return (
    <div className="max-w-md space-y-3">
      <TextField
        label="Aadhaar number"
        value={form.aadhaar}
        inputMode="numeric"
        maxLength={14}
        placeholder={editing && masked ? `On file: ${masked}` : '12 digits'}
        error={errors.aadhaar}
        hint={editing ? 'Leave blank to keep the number on file.' : 'Used to stop the same person being registered twice. Stored encrypted.'}
        onChange={(v) => { set({ aadhaar: v.replace(/[^\d ]/g, '') }); clear('aadhaar'); }}
      />
      {existingId && onOpenExisting && (
        <button type="button" onClick={() => onOpenExisting(existingId)} className={secondaryBtn}>Open the existing labourer</button>
      )}
    </div>
  );
}

export function FaceStep({ shots, onChange, issues, existing }: { shots: Shots; onChange: (p: (typeof FACE_POSES)[number], f: File | null) => void; issues: Errors; existing?: string }) {
  return (
    <div className="space-y-3">
      {existing && <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg-muted sm:text-sm">{existing}</p>}
      <FaceCapture shots={shots} onChange={onChange} issues={issues} />
      <p className="text-[11px] text-fg-muted">Take all three photos. You can also skip this and register the face later.</p>
    </div>
  );
}

export function DocumentsStep({ docs, setDocs, errors }: { docs: PendingDoc[]; setDocs: (d: PendingDoc[]) => void; errors: Errors }) {
  const patch = (key: string, p: Partial<PendingDoc>) => setDocs(docs.map((d) => (d.key === key ? { ...d, ...p } : d)));
  const add = () => setDocs([...docs, { key: `${Date.now()}-${docs.length}`, docType: 'aadhaar', side: 'front', number: '', expiryOn: '', file: null }]);
  return (
    <div className="space-y-3">
      {docs.length === 0 && <p className="text-xs text-fg-muted sm:text-sm">No documents added. Add ID proof, medical or police verification papers (PDF, JPG or PNG up to 5 MB).</p>}
      {docs.map((d) => (
        <div key={d.key} className="rounded-xl border border-line p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField label="Document" value={d.docType} options={LABOURER_DOC_TYPES} onChange={(v) => patch(d.key, { docType: v || 'other' })} />
            <SelectField label="Side" value={d.side} options={[{ value: 'front', label: 'Front' }, { value: 'back', label: 'Back' }, { value: 'single', label: 'Single page' }]} onChange={(v) => patch(d.key, { side: (v as PendingDoc['side']) || 'single' })} />
            <TextField label="Number" value={d.number} onChange={(v) => patch(d.key, { number: v })} />
            <TextField label="Expiry date" type="date" value={d.expiryOn} onChange={(v) => patch(d.key, { expiryOn: v })} />
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">File</span>
              <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => patch(d.key, { file: e.target.files?.[0] || null })}
                aria-invalid={Boolean(errors[`doc:${d.key}`]) || undefined}
                className={`block w-full rounded-lg border bg-surface p-1.5 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-bg-subtle file:px-3 file:py-1.5 file:text-xs file:font-semibold ${errors[`doc:${d.key}`] ? 'border-[var(--tt-danger)]' : 'border-line'}`} />
              {errors[`doc:${d.key}`] && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{errors[`doc:${d.key}`]}</p>}
              {d.file && <FilePreview file={d.file} />}
            </div>
          </div>
          <button type="button" onClick={() => setDocs(docs.filter((x) => x.key !== d.key))} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg"><Trash2 className="h-3.5 w-3.5" aria-hidden />Remove</button>
        </div>
      ))}
      <button type="button" onClick={add} className={secondaryBtn}><Plus className="h-3.5 w-3.5" aria-hidden />Add document</button>
    </div>
  );
}

/** Pack fields grouped by their `section`, in pack order (fields without one share an untitled group). */
function sectionsOf(fields: CompliancePack['fields']) {
  const out: Array<{ title: string; fields: CompliancePack['fields'] }> = [];
  for (const f of fields) {
    const title = f.section?.trim() || '';
    const last = out[out.length - 1];
    if (last && last.title === title) last.fields.push(f); else out.push({ title, fields: [f] });
  }
  return out;
}

/** What was picked, so nobody picks the same file again thinking it did not take: an image thumbnail, or the PDF's name and size. */
function FilePreview({ file }: { file: File }) {
  const url = React.useMemo(() => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
  React.useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg border border-line p-2">
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={file.name} className="h-16 w-16 rounded-md object-cover" /></a>
        : <span className="flex h-16 w-16 items-center justify-center rounded-md bg-bg-subtle text-xs font-bold text-fg-muted">PDF</span>}
      <div className="min-w-0 text-xs"><p className="truncate font-semibold text-fg">{file.name}</p><p className="text-fg-muted">{(file.size / 1024).toFixed(0)} KB · selected</p></div>
    </div>
  );
}

const OTHER = '__other__';

/** A dropdown of the usual answers plus "Other", which opens a box to type anything else (education, board ...). */
function ComboField({ label, required, options, value, error, onChange }: { label: string; required: boolean; options: string[]; value: string; error?: string; onChange: (v: string) => void }) {
  const [typing, setTyping] = React.useState(Boolean(value) && !options.includes(value));
  const choice = typing ? OTHER : value || null;
  return (
    <div className="space-y-2">
      <SelectField label={label} required={required} value={choice} error={typing ? undefined : error}
        options={[...options.map((o) => ({ value: o, label: o })), { value: OTHER, label: 'Other (type it)' }]}
        onChange={(x) => { if (x === OTHER) { setTyping(true); onChange(''); } else { setTyping(false); onChange(x || ''); } }} />
      {typing && <TextField label={`${label} (other)`} required={required} value={value} error={error} autoFocus onChange={onChange} />}
    </div>
  );
}

/** Picks one employee by name or code; the value stored is their id. */
function OfficerField({ label, required, value, error, onChange }: { label: string; required: boolean; value: string; error?: string; onChange: (id: string) => void }) {
  const [text, setText] = React.useState('');
  const [items, setItems] = React.useState<Officer[]>([]);
  const [picked, setPicked] = React.useState<Officer | null>(null);
  React.useEffect(() => {
    if (!text.trim()) { setItems([]); return undefined; }
    const t = setTimeout(() => { getOfficers(text.trim()).then((r) => setItems(r.items)).catch(() => setItems([])); }, 250);
    return () => clearTimeout(t);
  }, [text]);
  const shown = picked && String(picked.id) === value ? picked.name : value ? `Employee #${value}` : '';
  return (
    <div>
      <TextField label={label} required={required} value={text} error={error} hint={shown ? `Selected: ${shown}` : 'Type a name or code'} onChange={setText} />
      {items.length > 0 && (
        <ul className="mt-1 divide-y divide-line rounded-lg border border-line">
          {items.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => { setPicked(o); onChange(String(o.id)); setText(''); setItems([]); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg-subtle">
                <span className="font-semibold text-fg">{o.name}{o.code ? ` (${o.code})` : ''}</span>
                {!o.hasSignature && <span className="text-xs text-fg-muted">No signature on file</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The "Compliance details" step: renders the site pack's fields dynamically into `profile`, under section headings. */
export function CompliancePackStep({ pack, profile, onChange, errors, clear }: { pack: CompliancePack; profile: Record<string, string>; onChange: (p: Record<string, string>) => void; errors: Errors; clear: (k: string) => void }) {
  const set = (key: string, v: string) => { onChange({ ...profile, [key]: v }); clear(`profile.${key}`); };
  const field = (f: CompliancePack['fields'][number]) => {
    const key = `profile.${f.key}`;
    const v = profile[f.key] || '';
    if (f.type === 'select') return <SelectField key={f.key} label={f.label} required={f.required} value={v || null} options={f.options.map((o) => ({ value: o, label: o }))} error={errors[key]} onChange={(x) => set(f.key, x || '')} />;
    if (f.type === 'employee') return <OfficerField key={f.key} label={f.label} required={f.required} value={v} error={errors[key]} onChange={(x) => set(f.key, x)} />;
    if (f.type === 'combo') return <ComboField key={f.key} label={f.label} required={f.required} options={f.options} value={v} error={errors[key]} onChange={(x) => set(f.key, x)} />;
    if (f.type === 'textarea') return <div key={f.key} className="sm:col-span-2"><Textarea label={f.label} required={f.required} value={v} error={errors[key]} onChange={(e) => set(f.key, e.target.value)} /></div>;
    if (f.type === 'checkbox') {
      const on = ['true', 'yes', '1'].includes(v.toLowerCase());
      return (
        <div key={f.key}>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-fg">
            {f.label}{f.required && <span className="text-[var(--tt-danger)]"> *</span>}
            <Switch label={f.label} checked={on} onChange={(x) => set(f.key, x ? 'true' : 'false')} />
          </label>
          {errors[key] && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{errors[key]}</p>}
        </div>
      );
    }
    const type = f.type === 'number' ? 'text' : f.type === 'date' ? 'date' : f.type === 'phone' ? 'tel' : 'text';
    return <TextField key={f.key} label={f.label} required={f.required} type={type} inputMode={f.type === 'number' ? 'decimal' : f.type === 'phone' ? 'tel' : undefined} value={v} error={errors[key]} onChange={(x) => set(f.key, x)} />;
  };
  return (
    <div className="space-y-5">
      {pack.clientLabel && <p className="text-xs text-fg-muted sm:text-sm">Details required by {pack.clientLabel}.</p>}
      {sectionsOf(pack.fields).map((sec, i) => (
        <section key={`${sec.title}-${i}`} className="space-y-3" aria-label={sec.title || undefined}>
          {sec.title && <h3 className="border-b border-line pb-1.5 text-xs font-bold uppercase tracking-wide text-fg-muted">{sec.title}</h3>}
          <div className={grid}>{sec.fields.map(field)}</div>
        </section>
      ))}
    </div>
  );
}
