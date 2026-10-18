'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { btn } from '../../interviews/lib/ui';
import * as api from '../api/offers.api';

/** The candidate answered outside the system (signed copy, call): HR records it. */
export function RecordResponseDialog({ offerId, candidateName, onClose, onDone }: { offerId: number | null; candidateName: string; onClose: () => void; onDone: () => void }) {
  const [decision, setDecision] = useState<'accept' | 'decline'>('accept');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (offerId) { setDecision('accept'); setNote(''); setFile(null); setFileError(null); } }, [offerId]);

  async function save() {
    if (!offerId) return;
    setBusy(true);
    try {
      await api.recordResponse(offerId, { decision, note: note.trim() || undefined }, decision === 'accept' ? file : null);
      showSuccess(decision === 'accept' ? 'Recorded as accepted' : 'Recorded as declined');
      onDone();
      onClose();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={offerId !== null}
      onClose={() => !busy && onClose()}
      title="Record the candidate’s answer"
      maxWidthClassName="max-w-md"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={btn.secondary}>Cancel</button>
          <button type="button" onClick={save} disabled={busy} className={btn.primary}>{busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />} Save</button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-fg-muted">Use this when {candidateName} answered by phone, email or a signed copy instead of the online link.</p>
        <SegmentedControl options={[{ value: 'accept', label: 'Accepted' }, { value: 'decline', label: 'Declined' }] as const} value={decision} onChange={setDecision} />
        {decision === 'accept' && (
          <div>
            <FieldLabel label="Signed copy (optional)" />
            <label className={`${btn.secondary} cursor-pointer`}>
              <Paperclip className="h-4 w-4" /> <span className="max-w-[16rem] truncate">{file ? file.name : 'Attach the signed letter'}</span>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f && f.size > 5 * 1024 * 1024) { setFileError('The file must be 5 MB or smaller'); setFile(null); return; }
                  setFileError(null);
                  setFile(f);
                }}
              />
            </label>
            <p className={`mt-1 text-[11px] ${fileError ? 'font-medium text-[var(--tt-danger)]' : 'text-fg-muted'}`}>{fileError || 'PDF, JPG or PNG up to 5 MB. Kept privately and copied to the employee’s documents on hire.'}</p>
          </div>
        )}
        <div>
          <FieldLabel label="Note (optional)" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="e.g. Signed copy received on 18 Oct" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tt-primary)]" />
        </div>
      </div>
    </Dialog>
  );
}
