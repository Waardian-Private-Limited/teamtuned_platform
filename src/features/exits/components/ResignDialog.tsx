'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { inr } from '@/features/compensation/utils/format';
import { messageOf, statusOf } from '@/lib/api/errors';
import { formatDate, orgToday } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import { REASON_LABEL, RESIGN_REASONS } from '../constants/exits.constants';
import type { ExitCase, ExitPreview, ReasonCategory } from '../types/exits';
import { Fact, Skeleton } from './parts';

/** The employee's resignation: reason and an optional earlier last day, with the notice maths shown before anything is sent. */
export function ResignDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (c: ExitCase) => void }) {
  const [reason, setReason] = React.useState<ReasonCategory | null>(null);
  const [text, setText] = React.useState('');
  const [lwd, setLwd] = React.useState('');
  const [preview, setPreview] = React.useState<ExitPreview | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<{ reason?: string; lwd?: string; text?: string }>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { if (open) { setReason(null); setText(''); setLwd(''); setErrors({}); setPreview(null); setPreviewError(null); } }, [open]);

  React.useEffect(() => {
    if (!open) return;
    let live = true;
    setPreviewError(null);
    const t = setTimeout(() => {
      api.previewResign(lwd || undefined)
        .then((p) => { if (live) setPreview(p); })
        .catch((e) => { if (live) { setPreview(null); setPreviewError(messageOf(e)); } });
    }, lwd ? 350 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [open, lwd]);

  const submit = async () => {
    const next: typeof errors = {};
    if (!reason) next.reason = 'Choose a reason';
    if (reason === 'other' && !text.trim()) next.text = 'Tell us a little more';
    if (lwd && lwd < orgToday()) next.lwd = 'The last day cannot be in the past';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const c = await api.resign({ reason_category: reason!, reason_text: text.trim() || undefined, requested_lwd: lwd || undefined });
      showSuccess('Resignation submitted');
      onDone(c);
    } catch (e) {
      setErrors({ reason: statusOf(e) === 409 ? 'You already have an exit in progress.' : messageOf(e) });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-xl" title={<h2 className="text-sm font-bold text-fg sm:text-base">Resign</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="danger" busy={busy} onClick={submit}>Submit resignation</Btn></>}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">Your manager and HR will review this. You can withdraw it any time before it is accepted, and you keep working and keep access through your notice period.</p>
        <SelectField<ReasonCategory> label="Reason" required value={reason} onChange={setReason} error={errors.reason}
          options={RESIGN_REASONS.map((r) => ({ value: r, label: REASON_LABEL[r] }))} />
        <Textarea label="Anything you want to add" required={reason === 'other'} value={text} error={errors.text} maxLength={500} onChange={(e) => setText(e.target.value)} />
        <TextField label="Requested last working day" type="date" value={lwd} onChange={setLwd} min={orgToday()} error={errors.lwd}
          hint={preview ? `Leave empty to serve the full notice, ending ${formatDate(preview.notice_end)}` : 'Leave empty to serve the full notice'} />

        {previewError && <Alert message={previewError} />}
        {!preview && !previewError && <Skeleton className="h-24" />}
        {preview && (
          <div className="space-y-3 rounded-lg border border-line bg-bg-subtle/50 p-3">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Fact label="Notice period" value={`${preview.notice_days} days`} />
              <Fact label="Notice ends" value={formatDate(preview.notice_end)} />
              <Fact label="Your last working day" value={formatDate(preview.requested_lwd)} />
              <Fact label="Short of notice" value={preview.shortfall_days > 0 ? `${preview.shortfall_days} days` : 'None'} />
              <Fact label="Leave balance" value={`${preview.leave_balance_days} days`} />
              <Fact label="Advance to repay" value={inr(preview.advance_outstanding)} />
            </dl>
            {preview.shortfall_days > 0 && <p className="text-xs text-fg-muted">An earlier last day than your notice ends is for your manager and HR to agree. The shortfall may be recovered from your final settlement.</p>}
            {preview.warnings.map((w) => <p key={w} className="text-xs font-medium text-[var(--tt-warning)]">{w}</p>)}
          </div>
        )}
      </div>
    </Dialog>
  );
}
