'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Btn } from './Buttons';

export interface ConfirmState {
  title: string;
  body: React.ReactNode;
  cta: string;
  danger?: boolean;
  run: () => Promise<unknown>;
}

export function ConfirmDialog({ state, onClose }: { state: ConfirmState | null; onClose: () => void }) {
  const [busy, setBusy] = React.useState(false);
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
  return (
    <Dialog
      open
      onClose={onClose}
      title={<h2 className="text-sm font-bold text-fg sm:text-base">{state.title}</h2>}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant={state.danger ? 'danger' : 'primary'} busy={busy} onClick={confirm}>{state.cta}</Btn>
        </>
      }
    >
      <div className="text-xs text-fg-muted sm:text-sm">{state.body}</div>
    </Dialog>
  );
}
