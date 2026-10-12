'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import type { RevisionDto } from '@/features/compensation/types/compensation.dto';
import { date, inr } from '@/features/compensation/utils/format';
import * as api from '../../api/salaryRevisions.api';

export function RevisionVoidDialog({ revision, onClose, onVoided }: { revision: RevisionDto | null; onClose: () => void; onVoided: () => void }) {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setReason('');
    setError('');
  }, [revision]);

  if (!revision) return null;

  const confirm = async () => {
    if (!reason.trim()) {
      setError('Give a reason for voiding this salary version');
      return;
    }
    setBusy(true);
    try {
      await api.voidRevision(revision.id, reason.trim());
      showSuccess('Salary version voided');
      onVoided();
      onClose();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={<h2 className="text-sm font-bold text-fg sm:text-base">Void salary version</h2>}
      footer={
        <>
          <Btn onClick={onClose}>Close</Btn>
          <Btn variant="danger" busy={busy} onClick={confirm}>Void version</Btn>
        </>
      }
    >
      <div className="space-y-3 text-xs text-fg-muted sm:text-sm">
        <p>
          <b className="text-fg">{revision.employee.name}</b> · {revision.revision_type_label}, effective {date(revision.effective_from)} · {inr(revision.new_ctc)} CTC
        </p>
        <p>Voiding removes this salary version. Allowed only if no locked payroll used it. Its arrears are cancelled.</p>
        <div>
          <FieldLabel label="Reason" required />
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value.slice(0, 500)); setError(''); }}
            rows={3}
            aria-invalid={Boolean(error) || undefined}
            placeholder="Why is this version being removed?"
            className={cx(
              'w-full resize-none rounded-lg border bg-surface p-2.5 text-sm text-fg outline-none',
              error ? 'border-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)]'
            )}
          />
          <FieldMessage error={error} />
        </div>
      </div>
    </Dialog>
  );
}
