'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, FieldLabel, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { ResumeScanField, filledClass, useResumeScan } from '../../shared/components/ResumeScanField';
import { serverFieldOf } from '../../shared/utils/errors';
import { addLead } from '../api/pool.api';
import { LEAD_STATUS_LABELS, SOURCE_SUGGESTIONS } from '../constants/pool.constants';
import type { LeadInput, LeadStatus } from '../types/pool.types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STARTS: LeadStatus[] = ['new', 'called', 'interested', 'call_back', 'no_answer'];

type Form = Required<Pick<LeadInput, 'first_name' | 'last_name' | 'phone' | 'email' | 'lead_source' | 'current_title' | 'current_company' | 'total_experience' | 'city' | 'skills' | 'follow_up_on' | 'note'>> & { lead_status: LeadStatus };
const EMPTY: Form = {
  first_name: '', last_name: '', phone: '', email: '', lead_source: '', current_title: '', current_company: '',
  total_experience: '', city: '', skills: '', lead_status: 'new', follow_up_on: '', note: '',
};

/**
 * Adds one lead from a call, a walk-in or a job board. A resume is optional: Tuner reads it and fills the empty
 * fields. A person already in the pool can be opened instead.
 */
export function AddLeadDialog({ open, sources, onClose, onAdded, onOpenExisting }: {
  open: boolean;
  sources: string[];
  onClose: () => void;
  onAdded: (id: number) => void;
  onOpenExisting: (id: number) => void;
}) {
  const [v, setV] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form | 'form' | 'resume', string>>>({});
  const [existingId, setExistingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const scan = useResumeScan(v, setV);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setV(EMPTY); setErrors({}); setExistingId(null); scan.remove(); } }, [open]);

  const set = (k: keyof Form) => (val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    scan.unmark(k);
    setErrors((e) => (e[k] || e.form ? { ...e, [k]: undefined, form: undefined } : e));
  };

  const submit = async () => {
    const e: typeof errors = {};
    if (!v.first_name.trim()) e.first_name = 'Enter the first name';
    if (!v.phone.trim() && !v.email.trim()) e.phone = 'Enter a phone number or an email';
    if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email';
    if (v.lead_status === 'call_back' && !v.follow_up_on) e.follow_up_on = 'Pick when to call back';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setExistingId(null);
    try {
      const body = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, typeof val === 'string' ? val.trim() : val]).filter(([, val]) => val !== '')) as unknown as LeadInput;
      const res = await addLead(body, scan.resume);
      showSuccess(`${res.candidate.name} added to the talent pool`);
      onAdded(res.candidate.id);
    } catch (err) {
      const data = err instanceof ApiError ? (err.data as { candidateId?: number } | null) : null;
      if (data?.candidateId) {
        setExistingId(data.candidateId);
        setErrors({ form: messageOf(err) });
      } else {
        const field = serverFieldOf(err) as keyof Form | 'resume' | null;
        if (field && (field in EMPTY || field === 'resume')) setErrors({ [field]: messageOf(err) });
        else setErrors({ form: messageOf(err) });
      }
    } finally {
      setSaving(false);
    }
  };

  const suggestions = Array.from(new Set([...sources, ...SOURCE_SUGGESTIONS]));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add lead"
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || scan.reading} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-50">
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Add lead
          </button>
        </>
      }
    >
      <p className="mb-4 text-xs text-fg-muted">Someone who called, walked in or came from a job board. A phone number is enough; you can move them into a position later.</p>
      <div className="mb-4">
        <ResumeScanField scan={scan} error={errors.resume} />
      </div>
      <div className={cx('grid gap-4 transition-opacity sm:grid-cols-2', scan.reading && 'pointer-events-none opacity-40')} aria-busy={scan.reading}>
        <div className={filledClass(scan.filled.has('first_name'))}>
          <TextField label="First name" required value={v.first_name} onChange={set('first_name')} error={errors.first_name} maxLength={80} autoComplete="off" />
        </div>
        <div className={filledClass(scan.filled.has('last_name'))}>
          <TextField label="Last name" value={v.last_name} onChange={set('last_name')} error={errors.last_name} maxLength={80} autoComplete="off" />
        </div>
        <div className={filledClass(scan.filled.has('phone'))}>
          <TextField label="Phone" type="tel" value={v.phone} onChange={set('phone')} error={errors.phone} maxLength={20} autoComplete="off" />
        </div>
        <div className={filledClass(scan.filled.has('email'))}>
          <TextField label="Email" type="email" value={v.email} onChange={set('email')} error={errors.email} maxLength={190} autoComplete="off" />
        </div>
        <div className="sm:col-span-2">
          <TextField label="Source" value={v.lead_source} onChange={set('lead_source')} error={errors.lead_source} maxLength={80} list="pool-lead-sources" placeholder="Walk-in, Naukri, WhatsApp…" />
          <datalist id="pool-lead-sources">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.slice(0, 6).map((s) => <Chip key={s} active={v.lead_source === s} onClick={() => set('lead_source')(v.lead_source === s ? '' : s)}>{s}</Chip>)}
          </div>
        </div>
        <div className={filledClass(scan.filled.has('current_title'))}>
          <TextField label="Current title" value={v.current_title} onChange={set('current_title')} error={errors.current_title} maxLength={160} />
        </div>
        <div className={filledClass(scan.filled.has('current_company'))}>
          <TextField label="Current company" value={v.current_company} onChange={set('current_company')} error={errors.current_company} maxLength={160} />
        </div>
        <div className={filledClass(scan.filled.has('total_experience'))}>
          <TextField label="Experience (years)" type="number" inputMode="decimal" min={0} step="0.5" value={v.total_experience} onChange={set('total_experience')} error={errors.total_experience} />
        </div>
        <div className={filledClass(scan.filled.has('city'))}>
          <TextField label="City" value={v.city} onChange={set('city')} error={errors.city} maxLength={120} />
        </div>
        <div className="sm:col-span-2">
          <div className={filledClass(scan.filled.has('skills'))}><TextField label="Skills" value={v.skills} onChange={set('skills')} error={errors.skills} maxLength={500} placeholder="Comma separated, e.g. Tally, GST, Excel" /></div>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel label="Status" />
          <div className="flex flex-wrap gap-1.5">
            {STARTS.map((s) => <Chip key={s} active={v.lead_status === s} onClick={() => setV((p) => ({ ...p, lead_status: s }))}>{LEAD_STATUS_LABELS[s]}</Chip>)}
          </div>
        </div>
        <TextField label="Follow up on" type="date" value={v.follow_up_on} onChange={set('follow_up_on')} error={errors.follow_up_on} required={v.lead_status === 'call_back'} />
        <div className="sm:col-span-2">
          <Textarea label="Note" value={v.note} onChange={(e) => set('note')(e.target.value)} error={errors.note} maxLength={1000} rows={2} placeholder="What was discussed" />
        </div>
      </div>
      {errors.form && (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[var(--tt-danger)]/30 px-3 py-2 text-xs font-medium text-[var(--tt-danger)]">
          <span>{errors.form}</span>
          {existingId && (
            <button type="button" onClick={() => onOpenExisting(existingId)} className="shrink-0 rounded-md border border-line bg-surface px-2.5 py-1 font-semibold text-fg hover:bg-bg-subtle">Open</button>
          )}
        </div>
      )}
    </Dialog>
  );
}
