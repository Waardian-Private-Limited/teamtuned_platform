'use client';

import { useState, type ReactNode } from 'react';
import { Dialog } from './Dialog';

export interface ConfirmState {
  title: string;
  body: ReactNode;
  cta: string;
  danger?: boolean;
  run: () => Promise<unknown> | unknown;
}

/** A modal confirmation. Replaces window.confirm everywhere new code needs one. */
export function ConfirmDialog({ state, onClose }: { state: ConfirmState | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!state) return null;
  const confirm = async () => {
    setBusy(true);
    try {
      await state.run();
      onClose();
    } finally {
      setBusy(false);
    }
  };
  const base = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-40 sm:text-sm';
  return (
    <Dialog
      open
      onClose={onClose}
      title={<h2 className="text-sm font-bold text-fg sm:text-base">{state.title}</h2>}
      footer={
        <>
          <button type="button" onClick={onClose} className={`${base} border border-line bg-surface text-fg hover:bg-bg-subtle`}>Cancel</button>
          <button type="button" disabled={busy} onClick={confirm} className={`${base} ${state.danger ? 'bg-[var(--tt-danger)] text-white' : 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]'}`}>
            {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {state.cta}
          </button>
        </>
      }
    >
      <div className="text-xs text-fg-muted sm:text-sm">{state.body}</div>
    </Dialog>
  );
}
