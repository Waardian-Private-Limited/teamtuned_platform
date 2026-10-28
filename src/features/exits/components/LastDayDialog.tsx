'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import { SHORTFALL_LABEL } from '../constants/exits.constants';
import type { ExitCase, ShortfallAction } from '../types/exits';

/** Early release or extension of the agreed last working day. A note is required: every change is audited. */
export function LastDayDialog({ open, c, onClose, onDone }: { open: boolean; c: ExitCase; onClose: () => void; onDone: () => void }) {
  const [lwd, setLwd] = React.useState('');
  const [shortfall, setShortfall] = React.useState<ShortfallAction | null>(null);
  const [note, setNote] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) { setLwd(c.agreed_lwd || ''); setShortfall(c.shortfall_action); setNote(''); setErrors({}); } }, [open, c]);

  const early = Boolean(c.notice_end && lwd && lwd < c.notice_end);
  const save = async () => {
    const next: Record<string, string> = {};
    if (!lwd) next.lwd = 'Choose the last working day';
    if (!note.trim()) next.note = 'Say why the date changes';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await api.changeLastDay(c.id, { last_working_day: lwd, shortfall_action: early ? shortfall ?? undefined : undefined, note: note.trim() });
      showSuccess('Last working day updated');
      onDone();
    } catch (e) { setErrors({ form: messageOf(e) }); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} title={<h2 className="text-sm font-bold text-fg sm:text-base">Change last working day</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={save}>Save</Btn></>}>
      <div className="space-y-4">
        {errors.form && <Alert message={errors.form} />}
        <TextField label="Last working day" required type="date" value={lwd} onChange={setLwd} error={errors.lwd} hint={c.notice_end ? `Notice period ends ${c.notice_end}` : undefined} />
        {early && <SelectField<ShortfallAction> label="Notice shortfall" value={shortfall} onChange={setShortfall} options={(Object.keys(SHORTFALL_LABEL) as ShortfallAction[]).map((k) => ({ value: k, label: SHORTFALL_LABEL[k] }))} />}
        <Textarea label="Reason for the change" required value={note} error={errors.note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Dialog>
  );
}
