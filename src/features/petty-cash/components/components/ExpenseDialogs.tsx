'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import type { ActionError } from '@/features/reimbursement/hooks/useClaimActions';
import { leftoverError } from '../../utils/formError';
import { money } from '../../utils/format';
import { FormError } from './Primitives';

type NoteMode = 'undo_goods' | 'paper_back';

const NOTE_COPY: Record<NoteMode, { title: string; text: string; submit: string; placeholder: string }> = {
  undo_goods: {
    title: 'Undo this receipt',
    text: 'The goods of this receipt show as not received again. Its inward number is not used again.',
    submit: 'Undo receipt',
    placeholder: 'Why it is undone',
  },
  paper_back: {
    title: 'Paper bill not received',
    text: 'The paper bill shows as not received again.',
    submit: 'Set back to not received',
    placeholder: 'Why it is set back',
  },
};

interface InwardDialogProps {
  open: boolean;
  mode: NoteMode;
  busy: boolean;
  error: ActionError | null;
  onClose: () => void;
  onSubmit: (note: string) => void;
}

/** A confirmation with an optional note, for undoing a goods receipt or taking the paper bill back. */
export function InwardDialog({ open, mode, busy, error, onClose, onSubmit }: InwardDialogProps) {
  const [note, setNote] = React.useState('');
  React.useEffect(() => {
    if (open) setNote('');
  }, [open]);
  const copy = NOTE_COPY[mode];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title={copy.title}
      footer={
        <>
          <Btn onClick={onClose}>Back</Btn>
          <Btn variant="primary" busy={busy} onClick={() => onSubmit(note.trim())}>
            {copy.submit}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">{copy.text}</p>
        <Textarea label="Note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder={copy.placeholder} error={error?.fields.note} />
        <FormError message={leftoverError(error, ['note'])} />
      </div>
    </Dialog>
  );
}

interface CancelExpenseDialogProps {
  open: boolean;
  amount: number;
  approved: boolean;
  busy: boolean;
  error: ActionError | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

/** HR cancels an expense: a pending one releases the hold, an approved one gives the money back to the wallet. */
export function CancelExpenseDialog({ open, amount, approved, busy, error, onClose, onSubmit }: CancelExpenseDialogProps) {
  const [reason, setReason] = React.useState('');
  const [reasonError, setReasonError] = React.useState('');
  React.useEffect(() => {
    if (!open) return;
    setReason('');
    setReasonError('');
  }, [open]);
  const submit = () => {
    if (!reason.trim()) {
      setReasonError('Say why it is cancelled');
      return;
    }
    onSubmit(reason.trim());
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title="Cancel this expense"
      footer={
        <>
          <Btn onClick={onClose}>Keep it</Btn>
          <Btn variant="danger" busy={busy} onClick={submit}>
            Cancel expense
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          {approved ? (
            <>
              <span className="font-semibold text-fg">{money(amount)}</span> is put back in the wallet. The spender is told why.
            </>
          ) : (
            <>
              The <span className="font-semibold text-fg">{money(amount)}</span> held in the wallet is released. The spender is told why.
            </>
          )}
        </p>
        <Textarea label="Reason" required value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(''); }} error={reasonError || error?.fields.reason} rows={3} maxLength={300} />
        <FormError message={leftoverError(error, ['reason'])} />
      </div>
    </Dialog>
  );
}
