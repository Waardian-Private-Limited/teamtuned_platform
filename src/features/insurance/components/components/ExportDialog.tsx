'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField } from '@/components/ui/FormControls';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/insurance.api';
import { STATUS_TABS } from '../../constants/insurance.constants';
import type { Plan } from '../../types/insurance.types';

interface ExportDialogProps {
  open: boolean;
  plans: Plan[];
  initialPlanId: number | null;
  initialStatus: string;
  onClose: () => void;
}

export function ExportDialog({ open, plans, initialPlanId, initialStatus, onClose }: ExportDialogProps) {
  const { track } = useDownloadCenter();
  const [planId, setPlanId] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setPlanId(initialPlanId);
    setStatus(initialStatus === 'all' ? null : initialStatus);
    setError('');
  }, [open, initialPlanId, initialStatus]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      track(await api.exportCoverage({ plan_id: planId ?? undefined, status: status ?? undefined }));
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
      title="Export coverage"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={busy} onClick={submit} icon={<Download className="h-3.5 w-3.5" />}>Export to Excel</Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <p className="text-xs text-fg-muted">One sheet of covered employees and one of family members and nominees, as insurers ask for them.</p>
        <SelectField<number> label="Plan" numeric value={planId} onChange={setPlanId} options={plans.map((p) => ({ value: p.id, label: p.name }))} placeholder="All plans" />
        <SelectField<string> label="Status" value={status} onChange={setStatus} options={STATUS_TABS.filter((t) => t.value !== 'all').map((t) => ({ value: t.value, label: t.label }))} placeholder="All" />
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>}
      </div>
    </Dialog>
  );
}
