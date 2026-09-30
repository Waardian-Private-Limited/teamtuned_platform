'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { cx } from '@/theme/tokens';
import type { EmployeeListItemDto } from '../../types/employees.dto';
import type { StatusAction } from '../../hooks/useEmployeeStatus';
import { FieldMessage, TextField, labelClass, shellClass } from '@/components/ui/FormControls';

interface EmployeeActionDialogProps {
  target: { employee: EmployeeListItemDto; action: StatusAction } | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (exit?: { exitDate: string; reason: string }) => void;
}

const COPY: Record<StatusAction, { title: string; body: string; cta: string; danger: boolean }> = {
  activate: { title: 'Activate employee', body: 'They can sign in and mark attendance again.', cta: 'Activate', danger: false },
  deactivate: { title: 'Deactivate employee', body: 'Sign-in is blocked and active sessions end. Use this for long leave or suspension. You can activate again later.', cta: 'Deactivate', danger: true },
  terminate: { title: 'Terminate employee', body: 'Records the last working day and exit reason. Sign-in is blocked and the site budget is released. This cannot be undone.', cta: 'Terminate', danger: true },
  delete: { title: 'Delete employee', body: 'Removes an employee who never completed onboarding. Use this only for a record added by mistake.', cta: 'Delete', danger: true },
};

export function EmployeeActionDialog({ target, busy, onClose, onConfirm }: EmployeeActionDialogProps) {
  const [exitDate, setExitDate] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [errors, setErrors] = React.useState<{ exitDate?: string; reason?: string }>({});

  React.useEffect(() => {
    if (!target) return;
    setExitDate(new Date().toISOString().slice(0, 10));
    setReason('');
    setErrors({});
  }, [target]);

  if (!target) return null;
  const copy = COPY[target.action];
  const terminating = target.action === 'terminate';

  const confirm = () => {
    if (!terminating) return onConfirm();
    const next = { exitDate: exitDate ? undefined : 'Last working day is required', reason: reason.trim() ? undefined : 'Reason is required' };
    setErrors(next);
    if (next.exitDate || next.reason) return;
    onConfirm({ exitDate, reason: reason.trim() });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={<h2 className="text-sm font-bold text-fg sm:text-base">{copy.title}</h2>}
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className={cx(
              'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4.5 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm',
              copy.danger ? 'bg-[var(--tt-danger)] text-white hover:opacity-90' : 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]'
            )}
          >
            {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {copy.cta}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-fg-muted sm:text-sm">
          <span className="font-semibold text-fg">{target.employee.name}</span>
          {target.employee.employee_code ? ` (${target.employee.employee_code})` : ''}. {copy.body}
        </p>
        {terminating && (
          <>
            <TextField label="Last working day" required type="date" value={exitDate} onChange={setExitDate} error={errors.exitDate} />
            <div>
              <span className={labelClass}>Reason <span className="text-[var(--tt-danger)]">*</span></span>
              <div className={cx(shellClass(Boolean(errors.reason)), 'h-auto py-2')}>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Resigned, contract ended, absconding…"
                  className="w-full resize-none border-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle focus:ring-0"
                />
              </div>
              <FieldMessage error={errors.reason} />
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
