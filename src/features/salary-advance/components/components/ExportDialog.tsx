'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/salaryAdvance.api';
import type { AdvanceType } from '../../types/salaryAdvance.model';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Waiting for approval' },
  { value: 'to_disburse', label: 'To disburse' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'written_off', label: 'Written off' },
];

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  types: AdvanceType[];
  initialStatus: string;
  initialType: number | null;
}

export function ExportDialog({ open, onClose, types, initialStatus, initialType }: ExportDialogProps) {
  const { track } = useDownloadCenter();
  const [status, setStatus] = React.useState<string | null>(null);
  const [type, setType] = React.useState<number | null>(null);
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [rangeError, setRangeError] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setStatus(initialStatus === 'all' ? null : initialStatus);
    setType(initialType);
    setFrom('');
    setTo('');
    setRangeError('');
    setError('');
  }, [open, initialStatus, initialType]);

  const submit = async () => {
    if (from && to && from > to) {
      setRangeError('The end date is before the start date');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const job = await api.exportAdvances({ status: status ?? undefined, type: type ?? undefined, from: from || undefined, to: to || undefined });
      track(job);
      onClose();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title="Export advances"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={busy} onClick={submit} icon={<Download className="h-3.5 w-3.5" />}>
            Export to Excel
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">A register of advances with amounts paid out, recovered and outstanding. It is prepared in the background and appears in Downloads.</p>
        <SelectField label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="All statuses" />
        <SelectField<number> label="Type" value={type} onChange={setType} options={types.map((t) => ({ value: t.id, label: t.name }))} placeholder="All types" numeric />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Requested from" type="date" value={from} onChange={(v) => { setFrom(v); setRangeError(''); }} />
          <TextField label="Requested to" type="date" value={to} onChange={(v) => { setTo(v); setRangeError(''); }} error={rangeError} />
        </div>
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>}
      </div>
    </Dialog>
  );
}
