'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Btn } from '@/features/compensation/components/shared/Buttons';

export interface DecisionTarget {
  ids: number[];
  decision: 'approve' | 'reject' | 'cancel' | 'submit';
  label: string;
}

const COPY = {
  approve: { title: 'Approve revision', cta: 'Approve', danger: false, body: 'The new salary switches on its payroll date. Back-dated months are paid as arrears.' },
  reject: { title: 'Reject revision', cta: 'Reject', danger: true, body: 'The proposer can edit and resubmit it.' },
  cancel: { title: 'Cancel revision', cta: 'Cancel revision', danger: true, body: 'It will not apply and stays in history as cancelled.' },
  submit: { title: 'Submit for approval', cta: 'Submit', danger: false, body: 'Approvers are notified in the Pending tab.' },
};

export function RevisionDecisionDialog({ target, onClose, onConfirm }: { target: DecisionTarget | null; onClose: () => void; onConfirm: (note: string) => Promise<boolean> }) {
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setNote(''), [target]);
  if (!target) return null;
  const copy = COPY[target.decision];
  const withNote = target.decision === 'approve' || target.decision === 'reject';
  return (
    <Dialog
      open
      onClose={onClose}
      title={<h2 className="text-sm font-bold text-fg sm:text-base">{copy.title}</h2>}
      footer={
        <>
          <Btn onClick={onClose}>Close</Btn>
          <Btn variant={copy.danger ? 'danger' : 'primary'} busy={busy} onClick={async () => { setBusy(true); const ok = await onConfirm(note.trim()); setBusy(false); if (ok) onClose(); }}>{copy.cta}</Btn>
        </>
      }
    >
      <div className="space-y-3 text-xs text-fg-muted sm:text-sm">
        <p><b className="text-fg">{target.label}</b>. {copy.body}</p>
        {withNote && (
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={3} placeholder="Note (optional)" className="w-full resize-none rounded-lg border border-line bg-surface p-2.5 text-sm text-fg outline-none focus:border-[var(--tt-primary)]" />
        )}
      </div>
    </Dialog>
  );
}
