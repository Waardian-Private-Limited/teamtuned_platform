'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import type { HoldProgress } from '../../hooks/useSalarySlipActions';

interface HoldPayslipDialogProps {
  open: boolean;
  target: string;
  count: number;
  skippedNote?: string | null;
  busy: boolean;
  progress: HoldProgress | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<string | null>;
}

export function HoldPayslipDialog({ open, target, count, skippedNote, busy, progress, onClose, onSubmit }: HoldPayslipDialogProps) {
  const [reason, setReason] = React.useState('');
  const [fieldError, setFieldError] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setReason('');
      setFieldError('');
      setError('');
    }
  }, [open]);

  const submit = async () => {
    const r = reason.trim();
    if (!r) return setFieldError('Enter a reason for holding');
    if (r.length < 3) return setFieldError('Reason must be at least 3 characters');
    setFieldError('');
    setError('');
    const err = await onSubmit(r);
    if (err) setError(err);
  };

  const many = count > 1;

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      maxWidthClassName="max-w-md"
      title={many ? `Hold ${count} payslips` : 'Hold payslip'}
      footer={
        <>
          <Btn onClick={onClose} disabled={busy}>
            Cancel
          </Btn>
          <Btn variant="primary" busy={busy} icon={<Lock className="h-3.5 w-3.5" />} onClick={submit}>
            {many ? `Hold ${count}` : 'Hold'}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-fg-muted">
          The payslip of <span className="font-semibold text-fg">{target}</span> is hidden from the app and the salary is withheld until the hold is
          released.
        </p>
        {skippedNote && <p className="text-xs text-fg-muted">{skippedNote}</p>}
        <Textarea
          label={many ? 'Reason (applies to all)' : 'Reason'}
          required
          rows={3}
          maxLength={500}
          value={reason}
          disabled={busy}
          onChange={(e) => {
            setReason(e.target.value);
            if (fieldError) setFieldError('');
          }}
          placeholder="e.g. Exit formalities pending"
          error={fieldError}
        />
        {progress && progress.total > 1 && (
          <div className="space-y-1.5" aria-live="polite">
            <p className="text-xs font-medium text-fg">
              Holding {Math.min(progress.done + 1, progress.total)} of {progress.total}…
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle">
              <div className="h-full rounded-full bg-fg transition-[width] duration-200" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>}
      </div>
    </Dialog>
  );
}
