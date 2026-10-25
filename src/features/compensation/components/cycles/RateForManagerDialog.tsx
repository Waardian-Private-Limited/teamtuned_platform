'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/compensation.api';
import type { RatingLevel, RevisionDto } from '../../types/compensation.dto';
import { Btn } from '../shared/Buttons';
import { AssessmentFields, assessmentFrom, assessmentItem, emptyAssessment, type Assessment } from '../team/AssessmentFields';

/** HR rates one person in their manager's place (manager away or gone). The row then counts as submitted. */
export function RateForManagerDialog({ cycleId, row, scale, commentRequired, onClose, onSaved }: {
  cycleId: number;
  row: RevisionDto | null;
  scale: RatingLevel[];
  commentRequired: string[];
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const [value, setValue] = React.useState<Assessment>(emptyAssessment);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    setErrors({});
    setValue(row?.manager_review ? assessmentFrom(row.manager_review) : emptyAssessment);
  }, [row]);
  if (!row) return null;

  const save = async () => {
    const e: Record<string, string> = {};
    if (!value.rating) e.rating = 'Pick a rating';
    if (value.rating && commentRequired.includes(value.rating) && !value.comment.trim()) e.comment = 'Add a comment for this rating';
    if (value.recommend_promotion && !value.proposed_designation.trim()) e.proposed_designation = 'Name the proposed designation';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.rateForManager(cycleId, [assessmentItem(row.id, value)]);
      showSuccess('Rating saved for the manager');
      await onSaved();
      onClose();
    } catch (err) {
      const field = err instanceof ApiError ? (err.data as { field?: string } | null)?.field : undefined;
      setErrors({ [field?.split('.').pop() || 'rating']: messageOf(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      title={<h2 className="text-sm font-bold text-fg sm:text-base">Rate for {row.manager_review?.evaluator.name || 'the manager'}</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={save}>Save rating</Btn></>}
    >
      <div className="space-y-3">
        <p className="text-xs text-fg-muted sm:text-sm">{row.employee.name}{row.previous_designation ? ` · ${row.previous_designation}` : ''}. This counts as the manager’s submitted rating and shows as rated by HR.</p>
        <AssessmentFields value={value} onChange={setValue} scale={scale.map((s) => ({ rating: s.rating, label: s.label }))} commentRequired={commentRequired} errors={errors} />
      </div>
    </Dialog>
  );
}
