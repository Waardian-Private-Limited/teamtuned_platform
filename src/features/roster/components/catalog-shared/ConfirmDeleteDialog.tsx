'use client';

import { Dialog } from '@/components/ui/Dialog';
import { text } from '@/theme/tokens';
import { btnDanger, btnSecondary } from './catalogUi';
import { Spinner } from './Spinner';

interface Props {
  open: boolean;
  title: string;
  subject: string;
  body: string;
  isDeleting: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({ open, title, subject, body, isDeleting, error, onClose, onConfirm }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="button" disabled={isDeleting} onClick={onConfirm} className={btnDanger}>
            {isDeleting && <Spinner />}
            <span>Delete</span>
          </button>
        </>
      }
    >
      <p className={text.body}>
        Delete <span className="font-semibold text-fg">{subject}</span>? {body}
      </p>
      {error && <p role="alert" className="mt-3 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
    </Dialog>
  );
}
