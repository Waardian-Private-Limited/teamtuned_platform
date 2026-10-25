'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { cx } from '@/theme/tokens';
import type { ManagerReviewSummaryDto, RatingCheckDto } from '../../types/compensation.dto';
import { Btn } from '../shared/Buttons';

/**
 * Submit for approval. When Performance moved a rating after the import, a dispute is still open, or (manager-rated cycles)
 * managers did not submit, HR sees what and has to tick "Submit anyway" (the server refuses otherwise).
 */
export function SubmitCycleDialog({ open, check, managers, onClose, onSubmit }: {
  open: boolean;
  check: RatingCheckDto | undefined;
  managers?: ManagerReviewSummaryDto['totals'];
  onClose: () => void;
  onSubmit: (acknowledge: boolean) => Promise<unknown>;
}) {
  const [ack, setAck] = React.useState(false);
  const [missing, setMissing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) { setAck(false); setMissing(false); } }, [open]);
  const blocking = check?.blocking;
  const issues = [
    blocking?.rating_changed ? `${blocking.rating_changed} rating${blocking.rating_changed === 1 ? '' : 's'} changed in Performance after the import` : null,
    blocking?.disputed ? `${blocking.disputed} rating dispute${blocking.disputed === 1 ? ' is' : 's are'} still open` : null,
    managers?.people_pending ? `${managers.managers_pending} manager${managers.managers_pending === 1 ? ' has' : 's have'} not submitted ratings for ${managers.people_pending} ${managers.people_pending === 1 ? 'person' : 'people'}` : null,
  ].filter(Boolean) as string[];

  const submit = async () => {
    if (issues.length && !ack) { setMissing(true); return; }
    setBusy(true);
    try {
      await onSubmit(issues.length > 0);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={<h2 className="text-sm font-bold text-fg sm:text-base">Submit for approval</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={submit}>{issues.length ? 'Submit anyway' : 'Submit'}</Btn></>}
    >
      <div className="space-y-3 text-xs text-fg-muted sm:text-sm">
        <p>Draft proposals move to approval. Rows with no change are dropped on approval.</p>
        {issues.length > 0 && (
          <>
            <ul className="list-disc space-y-1 pl-5 text-fg">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
            <p>{managers ? 'Rate them yourself in the table, or go ahead with the ratings you have.' : 'Use “Import and apply” to take the current ratings, or wait until disputes are decided.'}</p>
            <label className={cx('flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-fg', missing && !ack ? 'border-[var(--tt-danger)]' : 'border-line')}>
              <input type="checkbox" className="mt-0.5" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>I have checked these and want to submit with the ratings as they are.</span>
            </label>
          </>
        )}
      </div>
    </Dialog>
  );
}
