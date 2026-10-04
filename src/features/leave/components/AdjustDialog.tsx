'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/leave.api';

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  employeeIds: number[];
  label: string;
  types: { id: number; name: string }[];
  defaultTypeId?: number | null;
}

// +/- days on one balance, with a reason that is kept in the ledger. Used for one employee or many.
export function AdjustDialog({ open, onClose, onDone, employeeIds, label, types, defaultTypeId }: Props) {
  const [typeId, setTypeId] = React.useState<number | null>(null);
  const [qty, setQty] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [expires, setExpires] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTypeId(defaultTypeId ?? types[0]?.id ?? null); setQty(''); setReason(''); setExpires(''); setErrors({});
  }, [open, defaultTypeId, types]);

  async function submit() {
    const next: Record<string, string> = {};
    const q = Number(qty);
    if (!typeId) next.type = 'Pick a leave type';
    if (!qty || !Number.isFinite(q) || q === 0) next.qty = 'Enter days to add (+) or remove (−)';
    if (!reason.trim()) next.reason = 'Give a reason';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const base = { leave_type_id: typeId!, quantity: q, reason: reason.trim(), ...(expires && q > 0 ? { expires_on: expires } : {}) };
      if (employeeIds.length === 1) await api.adjust({ employee_id: employeeIds[0], ...base });
      else {
        const r = await api.bulkAdjust({ employee_ids: employeeIds, ...base });
        if (r.failed) showError(`${r.failed} could not be adjusted: ${r.results.find((x) => !x.ok)?.error ?? ''}`);
      }
      showSuccess('Balance updated');
      onDone();
      onClose();
    } catch (e) {
      const m = messageOf(e);
      setErrors({ qty: m });
      showError(m);
    } finally { setSaving(false); }
  }

  return (
    <Dialog
      open={open} onClose={onClose} title="Adjust balance"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-line px-4 text-sm font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
          <button type="button" disabled={saving} onClick={submit} className="h-9 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] disabled:opacity-60">{saving ? 'Saving…' : 'Apply'}</button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">For <b className="text-fg">{label}</b></p>
        <SelectField label="Leave type" required numeric value={typeId} onChange={setTypeId} options={types.map((t) => ({ value: t.id, label: t.name }))} error={errors.type} />
        <TextField label="Days (+ add, − remove)" required type="number" step={0.5} value={qty} onChange={setQty} error={errors.qty} placeholder="2 or -1" />
        {Number(qty) > 0 && <TextField label="Expires on" type="date" value={expires} onChange={setExpires} hint="Leave empty if these days never expire" />}
        <TextField label="Reason" required value={reason} onChange={setReason} error={errors.reason} maxLength={500} placeholder="Kept in the leave history" />
      </div>
    </Dialog>
  );
}
