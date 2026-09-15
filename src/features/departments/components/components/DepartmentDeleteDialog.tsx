'use client';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { text } from '@/theme/tokens';
import type { Department } from '../../types/departments.model';

interface DepartmentDeleteDialogProps {
  open: boolean;
  department: Department | null;
  isDeleting: boolean;
  blockedMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DepartmentDeleteDialog({
  open,
  department,
  isDeleting,
  blockedMessage,
  onClose,
  onConfirm,
}: DepartmentDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete Department"
      footer={
        blockedMessage ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
          >
            Close
          </button>
        ) : (
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
              disabled={isDeleting}
              onClick={onConfirm}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-danger)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-danger)]/90 active:scale-[0.98] disabled:opacity-50 sm:text-sm"
            >
              {isDeleting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              <span>Delete</span>
            </button>
          </>
        )
      }
    >
      {blockedMessage ? (
        <Alert message={blockedMessage} tone="error" />
      ) : (
        <p className={text.body}>
          Are you sure you want to delete <span className="font-semibold text-fg">{department?.name}</span>? This
          action cannot be undone.
        </p>
      )}
    </Dialog>
  );
}
