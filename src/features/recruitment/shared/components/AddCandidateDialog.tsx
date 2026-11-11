'use client';

import { useEffect, useState } from 'react';
import { Combobox } from '@/components/ui/Combobox';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, FieldMessage, TextField } from '@/components/ui/FormControls';
import { useFeatures } from '@/lib/hooks/useFeatures';
import { showSuccess } from '@/lib/toast';
import { ApiError, messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import { addLead } from '../../pool/api/pool.api';
import { POOL_FEATURE } from '../../pool/constants/pool.constants';
import type { LeadInput } from '../../pool/types/pool.types';
import * as api from '../api/recruitment.api';
import { serverFieldOf } from '../utils/errors';
import { CANDIDATE_FIELD_KEYS, type CandidateFieldKey, type NamedRef } from '../types/recruitment.model';
import { usePositionOptions } from '../hooks/usePositionOptions';
import { EmployeePicker } from './EmployeePicker';
import { ResumeScanField, filledClass, useResumeScan } from './ResumeScanField';

type Field = CandidateFieldKey | 'referred_by_employee_id' | 'resume' | 'position_id';
type Values = Record<CandidateFieldKey, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KNOWN: Field[] = [...CANDIDATE_FIELD_KEYS, 'referred_by_employee_id', 'resume', 'position_id'];
const EMPTY = Object.fromEntries(CANDIDATE_FIELD_KEYS.map((k) => [k, ''])) as Values;

const NUMBERS: Partial<Record<CandidateFieldKey, { max: number; integer?: boolean; message: string }>> = {
  total_experience: { max: 60, message: 'Years, e.g. 3.5' },
  notice_period_days: { max: 365, integer: true, message: 'Whole days, e.g. 30' },
  current_ctc: { max: 1e12, message: 'Yearly amount, e.g. 650000' },
  expected_ctc: { max: 1e12, message: 'Yearly amount, e.g. 800000' },
};

type FieldSpec = { key: CandidateFieldKey; label: string; type?: string; inputMode?: 'decimal' | 'numeric'; max?: number; wide?: boolean; required?: boolean };

const FIELDS: FieldSpec[] = [
  { key: 'first_name', label: 'First name', required: true, max: 80 },
  { key: 'last_name', label: 'Last name', max: 80 },
  { key: 'email', label: 'Email', type: 'email', max: 190 },
  { key: 'phone', label: 'Phone', type: 'tel', max: 20 },
  { key: 'current_title', label: 'Current title', max: 160 },
  { key: 'current_company', label: 'Current company', max: 160 },
  { key: 'total_experience', label: 'Experience (years)', inputMode: 'decimal' },
  { key: 'city', label: 'City', max: 120 },
  { key: 'notice_period_days', label: 'Notice period (days)', inputMode: 'numeric' },
  { key: 'linkedin_url', label: 'LinkedIn', type: 'url', max: 300 },
  { key: 'current_ctc', label: 'Current CTC (yearly)', inputMode: 'numeric' },
  { key: 'expected_ctc', label: 'Expected CTC (yearly)', inputMode: 'numeric' },
  { key: 'portfolio_url', label: 'Portfolio / website', type: 'url', max: 300 },
  { key: 'skills', label: 'Skills', max: 500, wide: true },
];

function validate(v: Values): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (!v.first_name.trim()) e.first_name = 'Enter the first name';
  if (!v.email.trim() && !v.phone.trim()) e.phone = 'Enter a phone number or an email';
  else if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email';
  if (v.phone.trim() && !/^[+\d][\d\s()-]{6,19}$/.test(v.phone.trim())) e.phone = 'Enter a valid phone number';
  (Object.keys(NUMBERS) as CandidateFieldKey[]).forEach((k) => {
    const raw = v[k].trim();
    if (!raw) return;
    const n = Number(raw);
    const spec = NUMBERS[k]!;
    if (!Number.isFinite(n) || n < 0 || n > spec.max || (spec.integer && !Number.isInteger(n))) e[k] = spec.message;
  });
  return e;
}

/** What happened: an application in a position, or a new lead in the talent pool. */
export type AddCandidateResult = { applicationId: number | null } | { leadId: number };

/**
 * Recruiter adds a candidate by hand. The resume goes first: Tuner reads it and fills the empty fields.
 * Candidates are people in a position. Opened without a position, the recruiter picks one; with the talent pool
 * add-on the position may be left empty and the person goes to the talent pool as a New lead for the callers, who
 * move them into a position later. Without the add-on the position is required.
 */
export function AddCandidateDialog({ open, position, onClose, onAdded, onOpenExisting }: {
  open: boolean;
  /** Fixed position (opened from a position's pipeline). Without it the recruiter picks one. */
  position?: { id: number; title: string } | null;
  onClose: () => void;
  onAdded: (result: AddCandidateResult) => void;
  /** A person already in the talent pool: open them there. */
  onOpenExisting?: (candidateId: number) => void;
}) {
  const hasPool = useFeatures().hasFeature(POOL_FEATURE);
  const [v, setV] = useState<Values>(EMPTY);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [referrer, setReferrer] = useState<NamedRef | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field | 'form', string>>>({});
  const [existingId, setExistingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const scan = useResumeScan(v, setV);
  const positions = usePositionOptions(open && !position);

  useEffect(() => {
    if (!open) return;
    setV(EMPTY); setPositionId(null); setReferrer(null); setErrors({}); setExistingId(null);
    scan.remove();
    if (!position) positions.search('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: CandidateFieldKey) => (val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
    scan.unmark(k);
  };

  const targetId = position?.id ?? positionId;
  const toPool = !targetId && hasPool;

  const save = async (): Promise<AddCandidateResult> => {
    if (targetId) {
      return api.addCandidate({ positionId: targetId, fields: v, referredByEmployeeId: referrer?.id ?? null, resume: scan.resume });
    }
    const body = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val.trim()]).filter(([, val]) => val !== '')) as unknown as LeadInput;
    const res = await addLead({ ...body, lead_status: 'new' }, scan.resume);
    return { leadId: res.candidate.id };
  };

  const submit = async () => {
    const e = validate(v);
    if (!targetId && !hasPool) e.position_id = 'Choose a position';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setExistingId(null);
    try {
      const res = await save();
      showSuccess('leadId' in res ? 'Added to the talent pool as a New lead' : 'Candidate added');
      onAdded(res);
    } catch (err) {
      const data = err instanceof ApiError ? (err.data as { candidateId?: number } | null) : null;
      if (toPool && data?.candidateId) {
        setExistingId(data.candidateId);
        setErrors({ form: messageOf(err) });
        return;
      }
      const raw = serverFieldOf(err);
      const field = raw ? (raw.replace(/^candidate[.[]/, '').replace(/]$/, '') as Field) : null;
      if (field && KNOWN.includes(field)) setErrors({ [field]: messageOf(err) });
      else setErrors({ form: messageOf(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add candidate"
      maxWidthClassName="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || scan.reading} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-50">
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {toPool ? 'Add to talent pool' : 'Add to Applied'}
          </button>
        </>
      }
    >
      {position ? (
        <p className="mb-4 text-xs text-fg-muted">Adds the person to <span className="font-semibold text-fg">{position.title}</span>. If the email (or, without one, the phone) already belongs to a candidate, the existing profile is reused. Without an email, no emails go to them.</p>
      ) : (
        <div className="mb-4">
          <FieldLabel label="Position" required={!hasPool} />
          <Combobox
            options={positions.options}
            value={positionId}
            onChange={(val) => { setPositionId(val === null ? null : Number(val)); setErrors((e) => ({ ...e, position_id: undefined, form: undefined })); setExistingId(null); }}
            onSearch={positions.search}
            loading={positions.loading}
            placeholder={hasPool ? 'No position yet' : 'Choose a position'}
            searchPlaceholder="Search positions…"
            emptyLabel="No open positions"
            invalid={Boolean(errors.position_id)}
            ariaLabel="Position"
          />
          <FieldMessage
            error={errors.position_id}
            hint={hasPool ? 'Optional. Without a position they go to the talent pool as a New lead; move them into a position from there.' : undefined}
          />
        </div>
      )}

      <div className="mb-4">
        <ResumeScanField scan={scan} error={errors.resume} />
      </div>

      <div className={cx('grid gap-4 transition-opacity sm:grid-cols-2', scan.reading && 'pointer-events-none opacity-40')} aria-busy={scan.reading}>
        {FIELDS.map((f) => (
          <div key={f.key} className={cx(f.wide && 'sm:col-span-2', filledClass(scan.filled.has(f.key)))}>
            <TextField
              label={f.label}
              required={f.required}
              type={f.type || 'text'}
              inputMode={f.inputMode}
              value={v[f.key]}
              onChange={set(f.key)}
              error={errors[f.key]}
              maxLength={f.max}
              autoComplete="off"
              hint={scan.filled.has(f.key) ? 'Filled by Tuner' : undefined}
            />
          </div>
        ))}
        {!toPool && (
          <div className="sm:col-span-2">
            <FieldLabel label="Referred by" />
            <EmployeePicker
              value={referrer}
              onChange={(r) => { setReferrer(r); setErrors((e) => ({ ...e, referred_by_employee_id: undefined })); }}
              placeholder="Employee who referred them"
              ariaLabel="Referred by"
              invalid={Boolean(errors.referred_by_employee_id)}
            />
            <FieldMessage error={errors.referred_by_employee_id} hint="They earn the referral reward if this person is hired." />
          </div>
        )}
      </div>
      {errors.form && (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[var(--tt-danger)]/30 px-3 py-2 text-xs font-medium text-[var(--tt-danger)]">
          <span>{errors.form}</span>
          {existingId && onOpenExisting && (
            <button type="button" onClick={() => onOpenExisting(existingId)} className="shrink-0 rounded-md border border-line bg-surface px-2.5 py-1 font-semibold text-fg hover:bg-bg-subtle">Open in talent pool</button>
          )}
        </div>
      )}
    </Dialog>
  );
}
