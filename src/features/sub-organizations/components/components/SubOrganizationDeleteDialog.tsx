'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import type { SubOrganization } from '../../types/sub-organizations.model';

export function SubOrganizationDeleteDialog({
  open,
  target,
  isSaving,
  blockedMessage,
  onClose,
  onConfirm,
}: {
  open: boolean;
  target: SubOrganization | null;
  isSaving: boolean;
  blockedMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Deactivate sub-organization"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || Boolean(blockedMessage)}
            onClick={onConfirm}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-danger)] px-4.5 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            <span>Deactivate</span>
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {blockedMessage && <Alert message={blockedMessage} tone="error" />}
        <p className="text-xs leading-relaxed text-fg-muted sm:text-sm">
          <span className="font-semibold text-fg">{target?.name}</span> will be marked inactive. It stays on existing
          invoices and Form 16 certificates already issued, and can be reactivated by editing it.
        </p>
      </div>
    </Dialog>
  );
}
