'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Btn, Labeled, inputCls } from '@/features/data-collection/components/shared/Ui';
import { cx } from '@/theme/tokens';

/** Asks why a task goes back. The note is required and shown on the task. */
export function ReturnDialog({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (note: string) => Promise<unknown> }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!note.trim()) { setError('Say what needs to change'); return; }
    setBusy(true);
    try { await onSend(note.trim()); setNote(''); onClose(); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Send back for changes"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={send}>Send back</Btn></>}>
      <Labeled label="What needs to change?" error={error} required>
        <textarea rows={4} value={note} onChange={(e) => { setNote(e.target.value); setError(''); }} aria-invalid={Boolean(error)}
          className={cx(inputCls(Boolean(error)), 'h-auto py-2')} placeholder="Be specific so the work can be fixed in one go" />
      </Labeled>
    </Dialog>
  );
}

/** Approving can carry a 1 to 5 rating; leaving it empty is fine. */
export function ApproveDialog({ open, onClose, onApprove }: { open: boolean; onClose: () => void; onApprove: (rating: number | null) => Promise<unknown> }) {
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await onApprove(rating); setRating(null); onClose(); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Approve this task"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={go}>Approve</Btn></>}>
      <p className="mb-3 text-sm text-fg-muted">Rate the work if you like. The rating is kept for performance later.</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} onClick={() => setRating(rating === n ? null : n)}
            className="rounded-lg p-1.5 hover:bg-bg-subtle"><Star className={cx('h-7 w-7', rating !== null && n <= rating ? 'fill-fg text-fg' : 'text-line-strong')} /></button>
        ))}
      </div>
    </Dialog>
  );
}
