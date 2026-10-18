'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { FieldLabel, FieldMessage, SelectField, shellClass } from '@/components/ui/FormControls';
import { cx } from '@/theme/tokens';
import { REJECTION_REASONS } from '../constants/recruitment.constants';

interface RejectDialogProps {
  open: boolean;
  candidateName: string;
  isSaving?: boolean;
  /** Server error to show under the reason. */
  error?: string;
  onClose: () => void;
  onConfirm: (reason: string, notify: boolean) => void;
}

/** Reject with a reason (picked + optional detail) and an optional email to the candidate. */
export function RejectDialog({ open, candidateName, isSaving, error, onClose, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [notify, setNotify] = useState(true);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) { setReason(null); setDetail(''); setNotify(true); setTouched(false); }
  }, [open]);

  const needsDetail = reason === 'Other';
  const reasonError = touched && !reason ? 'Pick a reason' : undefined;
  const detailError = touched && needsDetail && !detail.trim() ? 'Describe the reason' : undefined;

  const submit = () => {
    setTouched(true);
    if (!reason || (needsDetail && !detail.trim())) return;
    const text = needsDetail ? detail.trim() : detail.trim() ? `${reason}: ${detail.trim()}` : reason;
    onConfirm(text.slice(0, 255), notify);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Reject ${candidateName}`}
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isSaving}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--tt-danger)] px-3.5 text-sm font-semibold text-[var(--tt-on-primary)] hover:opacity-90 disabled:opacity-50"
          >
            {isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Reject
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectField
          label="Reason"
          required
          value={reason}
          onChange={setReason}
          options={REJECTION_REASONS.map((r) => ({ value: r, label: r }))}
          placeholder="Select a reason…"
          error={reasonError || (error && !detailError ? error : undefined)}
        />
        <div>
          <FieldLabel label={needsDetail ? 'Details' : 'Details (optional)'} required={needsDetail} />
          <div className={cx(shellClass(Boolean(detailError)), 'h-auto py-2')}>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="Internal note; not sent to the candidate."
              className="w-full resize-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
            />
          </div>
          <FieldMessage error={detailError} />
        </div>
        <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-bg-subtle/50 p-3">
          <div>
            <p className="text-sm font-semibold text-fg">Email the candidate</p>
            <p className="text-xs text-fg-muted">Sends a polite rejection email (if rejection emails are on in settings). The reason is never shared.</p>
          </div>
          <Switch checked={notify} onChange={setNotify} label="Email the candidate" />
        </div>
      </div>
    </Dialog>
  );
}
