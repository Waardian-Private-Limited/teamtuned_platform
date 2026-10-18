'use client';

import { useState } from 'react';
import { FieldLabel, FieldMessage, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { btn, fieldOf } from '../../interviews/lib/ui';
import { EmployeeMultiPicker, type EmployeeLite } from '../../interviews/lib/EmployeePickers';
import { saveBlob, safeFileName } from '@/features/document-centre/lib/files';
import * as api from '../api/reviews.api';
import type { ReviewDecision } from '../types/reviews.dto';

const area = 'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tt-primary)]';

/** Ask employees (e.g. the hiring manager, the MD) to review the candidate before an offer. */
export function AskReviewForm({ applicationId, onDone, onCancel }: { applicationId: number; onDone: () => void; onCancel?: () => void }) {
  const [people, setPeople] = useState<EmployeeLite[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!people.length) { setError('Pick at least one reviewer'); return; }
    setBusy(true);
    try {
      await api.requestReviews(applicationId, { reviewer_employee_ids: people.map((p) => p.id), message: message.trim() || undefined });
      showSuccess(people.length === 1 ? `Review requested from ${people[0].name}` : `Review requested from ${people.length} people`);
      onDone();
    } catch (err) {
      if (fieldOf(err)) setError(messageOf(err)); else showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel label="Reviewers" required />
        <EmployeeMultiPicker value={people} onChange={(v) => { setPeople(v); setError(null); }} invalid={Boolean(error)} placeholder="Add reviewer…" />
        <FieldMessage error={error ?? undefined} hint="They see the resume, tests, every interview and HR notes, and answer: make an offer, do not hire, or hold." />
      </div>
      <div>
        <FieldLabel label="Message (optional)" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1000} placeholder="e.g. Strong technical round; please confirm the offer at 14 LPA." className={cx(area, 'border-line')} />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <button type="button" onClick={onCancel} className={btn.secondary}>Back</button>}
        <button type="button" onClick={send} disabled={busy} className={btn.primary}>{busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />} Send for review</button>
      </div>
    </div>
  );
}

/** Records the decision of someone who reviewed outside the system (call, signed review pack). */
export function OfflineDecisionForm({ applicationId, onDone, onCancel }: { applicationId: number; onDone: () => void; onCancel?: () => void }) {
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [decision, setDecision] = useState<ReviewDecision>('offer');
  const [ctc, setCtc] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) { setErrors({ reviewer_name: 'Who decided?' }); return; }
    setBusy(true);
    try {
      await api.recordOffline(applicationId, {
        reviewer_name: name.trim(),
        reviewer_designation: designation.trim() || undefined,
        decision,
        note: note.trim() || undefined,
        suggested_ctc: decision === 'offer' && ctc ? Number(ctc) : null,
        suggested_joining_date: decision === 'offer' && date ? date : null,
      });
      showSuccess('Decision recorded');
      onDone();
    } catch (err) {
      const f = fieldOf(err);
      if (f) setErrors({ [f]: messageOf(err) }); else showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Decided by" required value={name} onChange={(v) => { setName(v); setErrors({}); }} placeholder="e.g. Rahul Mehta" error={errors.reviewer_name} maxLength={160} />
        <TextField label="Designation" value={designation} onChange={setDesignation} placeholder="e.g. Managing Director" maxLength={120} />
      </div>
      <div>
        <FieldLabel label="Decision" required />
        <SegmentedControl options={[{ value: 'offer', label: 'Make an offer' }, { value: 'reject', label: 'Do not hire' }, { value: 'hold', label: 'Hold' }] as const} value={decision} onChange={setDecision} />
      </div>
      {decision === 'offer' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Suggested annual CTC" type="number" inputMode="numeric" value={ctc} onChange={setCtc} error={errors.suggested_ctc} prefix="₹" />
          <TextField label="Suggested joining date" type="date" value={date} onChange={setDate} error={errors.suggested_joining_date} />
        </div>
      )}
      <div>
        <FieldLabel label="Note" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="e.g. Approved on call, 16 Oct" className={cx(area, errors.note ? 'border-[var(--tt-danger)]' : 'border-line')} />
        <FieldMessage error={errors.note} />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <button type="button" onClick={onCancel} className={btn.secondary}>Back</button>}
        <button type="button" onClick={save} disabled={busy} className={btn.primary}>{busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />} Record decision</button>
      </div>
    </div>
  );
}

/** Downloads the review pack (candidate dossier PDF with the resume). */
export async function downloadReviewPack(applicationId: number, candidateName: string) {
  try {
    saveBlob(await api.reviewPack(applicationId), safeFileName('Review pack', candidateName));
    showSuccess('Review pack downloaded');
  } catch (err) {
    showError(messageOf(err));
  }
}
