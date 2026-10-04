'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

interface Props {
  approve: boolean;
  summary: string;
  onClose: () => void;
  onConfirm: (note: string) => Promise<string | null>;
}

export function DecisionDialog({ approve, summary, onClose, onConfirm }: Props) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError('');
    const err = await onConfirm(note.trim());
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={approve ? 'Approve request' : 'Decline request'}
      footer={
        <>
          <Button variant="secondary" className="!h-10 !w-auto !px-4 !text-sm" onClick={onClose}>Close</Button>
          <Button variant={approve ? 'primary' : 'danger'} className="!h-10 !w-auto !px-4 !text-sm" loading={saving} onClick={submit}>
            {approve ? 'Approve' : 'Decline'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">{summary}</p>
        <Textarea label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} error={error || undefined} />
      </div>
    </Dialog>
  );
}
