'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/interviews.api';
import { btn, fieldOf } from '../lib/ui';

export function CancelInterviewDialog({
  interviewId,
  label,
  onClose,
  onDone,
}: {
  interviewId: number | null;
  label?: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (interviewId === null) return;
    setReason('');
    setNotify(true);
    setError('');
  }, [interviewId]);

  async function submit() {
    if (interviewId === null) return;
    if (!reason.trim()) { setError('Give a reason'); return; }
    setSaving(true);
    try {
      await api.cancelInterview(interviewId, reason.trim(), notify);
      showSuccess('Interview cancelled');
      onDone?.();
      onClose();
    } catch (err) {
      if (fieldOf(err) === 'reason') setError(messageOf(err));
      else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={interviewId !== null}
      onClose={onClose}
      title="Cancel interview"
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>Keep</button>
          <button type="button" onClick={submit} disabled={saving} className={btn.danger}>
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Cancel interview
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {label && <p className="text-sm text-fg-muted">{label}</p>}
        <Textarea
          label="Reason"
          required
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(''); }}
          error={error || undefined}
          maxLength={255}
          placeholder="e.g. Interviewer unavailable"
        />
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
          <p className="text-xs font-semibold text-fg sm:text-sm">Email the candidate</p>
          <Switch checked={notify} onChange={setNotify} label="Email the candidate" />
        </div>
      </div>
    </Dialog>
  );
}
