'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, FieldMessage, TextField } from '@/components/ui/FormControls';
import { showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import * as api from '../../shared/api/recruitment.api';
import { serverFieldOf } from '../../shared/utils/errors';
import { EmployeePicker } from '../../shared/components/EmployeePicker';
import type { NamedRef } from '../../shared/types/recruitment.model';

type Field = 'first_name' | 'last_name' | 'email' | 'phone' | 'current_title' | 'current_company' | 'total_experience' | 'referred_by_employee_id' | 'resume';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const empty = { firstName: '', lastName: '', email: '', phone: '', currentTitle: '', currentCompany: '', totalExperience: '' };

export function AddCandidateDialog({ open, positionId, positionTitle, onClose, onAdded }: {
  open: boolean;
  positionId: number;
  positionTitle: string;
  onClose: () => void;
  onAdded: (applicationId: number | null) => void;
}) {
  const [v, setV] = useState(empty);
  const [resume, setResume] = useState<File | null>(null);
  const [referrer, setReferrer] = useState<NamedRef | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field | 'form', string>>>({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setV(empty); setResume(null); setReferrer(null); setErrors({}); } }, [open]);

  const set = (k: keyof typeof empty, field: Field) => (val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!/\.(pdf|docx?)$/i.test(f.name)) { setErrors((e) => ({ ...e, resume: 'Use a PDF or Word file' })); return; }
    if (f.size > MAX_BYTES) { setErrors((e) => ({ ...e, resume: 'Keep the file under 5 MB' })); return; }
    setResume(f);
    setErrors((e) => ({ ...e, resume: undefined }));
  };

  const submit = async () => {
    const e: Partial<Record<Field, string>> = {};
    if (!v.firstName.trim()) e.first_name = 'Enter the first name';
    if (!v.email.trim()) e.email = 'Enter an email';
    else if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email';
    if (v.phone.trim() && !/^[+\d][\d\s-]{6,19}$/.test(v.phone.trim())) e.phone = 'Enter a valid phone number';
    if (v.totalExperience.trim() && (!Number.isFinite(Number(v.totalExperience)) || Number(v.totalExperience) < 0)) e.total_experience = 'Years, e.g. 3.5';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const res = await api.addCandidate({ positionId, ...v, referredByEmployeeId: referrer?.id ?? null, resume });
      showSuccess('Candidate added');
      onAdded(res && typeof res.id === 'number' ? res.id : null);
    } catch (err) {
      const raw = serverFieldOf(err);
      const field = raw ? (raw.replace(/^candidate[.[]/, '').replace(/]$/, '') as Field) : null;
      const known: Field[] = ['first_name', 'last_name', 'email', 'phone', 'current_title', 'current_company', 'total_experience', 'referred_by_employee_id', 'resume'];
      if (field && known.includes(field)) setErrors({ [field]: messageOf(err) });
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
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-50">
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Add to Applied
          </button>
        </>
      }
    >
      <p className="mb-4 text-xs text-fg-muted">Adds the person to <span className="font-semibold text-fg">{positionTitle}</span>. If the email already belongs to a candidate, the existing profile is reused.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" required value={v.firstName} onChange={set('firstName', 'first_name')} error={errors.first_name} maxLength={80} autoComplete="off" />
        <TextField label="Last name" value={v.lastName} onChange={set('lastName', 'last_name')} error={errors.last_name} maxLength={80} autoComplete="off" />
        <TextField label="Email" required type="email" value={v.email} onChange={set('email', 'email')} error={errors.email} maxLength={190} autoComplete="off" />
        <TextField label="Phone" type="tel" value={v.phone} onChange={set('phone', 'phone')} error={errors.phone} maxLength={20} autoComplete="off" />
        <TextField label="Current title" value={v.currentTitle} onChange={set('currentTitle', 'current_title')} error={errors.current_title} maxLength={160} />
        <TextField label="Current company" value={v.currentCompany} onChange={set('currentCompany', 'current_company')} error={errors.current_company} maxLength={160} />
        <TextField label="Experience (years)" type="number" inputMode="decimal" min={0} step="0.5" value={v.totalExperience} onChange={set('totalExperience', 'total_experience')} error={errors.total_experience} />
        <div>
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
        <div className="sm:col-span-2">
          <FieldLabel label="Resume" />
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0] || null); e.target.value = ''; }} />
          {resume ? (
            <div className={cx('flex h-10 items-center gap-2 rounded-lg border px-3', errors.resume ? 'border-[var(--tt-danger)]' : 'border-line')}>
              <FileText className="h-4 w-4 shrink-0 text-fg-muted" />
              <span className="min-w-0 flex-1 truncate text-sm text-fg">{resume.name}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-fg-subtle">{Math.ceil(resume.size / 1024)} KB</span>
              <button type="button" onClick={() => setResume(null)} aria-label="Remove resume" className="rounded p-0.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] || null); }}
              className={cx('flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-5 text-xs text-fg-muted hover:bg-bg-subtle/50', errors.resume ? 'border-[var(--tt-danger)]' : 'border-line-strong')}
            >
              <Upload className="h-4 w-4" />
              <span><span className="font-semibold text-fg">Choose a file</span> or drop it here</span>
              <span className="text-[11px] text-fg-subtle">PDF, DOC or DOCX, up to 5 MB</span>
            </button>
          )}
          <FieldMessage error={errors.resume} />
        </div>
      </div>
      {errors.form && <p role="alert" className="mt-4 text-xs font-medium text-[var(--tt-danger)]">{errors.form}</p>}
    </Dialog>
  );
}
