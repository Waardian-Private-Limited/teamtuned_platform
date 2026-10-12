'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Btn } from '@/features/compensation/components/shared/Buttons';

interface ConfirmPayslipDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmPayslipDialog({ open, title, message, confirmLabel, busy, error, onClose, onConfirm }: ConfirmPayslipDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      maxWidthClassName="max-w-md"
      title={title}
      footer={
        <>
          <Btn onClick={onClose} disabled={busy}>
            Cancel
          </Btn>
          <Btn variant="primary" busy={busy} onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="text-sm leading-relaxed text-fg-muted">{message}</div>
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>}
      </div>
    </Dialog>
  );
}
