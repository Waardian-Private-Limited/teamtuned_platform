'use client';

import { Dialog } from '@/components/ui/Dialog';

export function ClosePositionDialog({ open, title, busy, onClose, onConfirm }: {
  open: boolean;
  title: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Close position"
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--tt-primary)] px-3.5 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-50">
            {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Close position
          </button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">
        <span className="font-semibold text-fg">{title}</span> stops taking applications and leaves the careers page.
        Candidates already in the pipeline stay where they are. You can reopen it later.
      </p>
    </Dialog>
  );
}
