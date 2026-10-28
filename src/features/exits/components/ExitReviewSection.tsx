'use client';

import React from 'react';
import Link from 'next/link';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { formatDate, daysBetween } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/exits.api';
import { REHIRE_LABEL, SHORTFALL_LABEL } from '../constants/exits.constants';
import type { ExitCaseDetail, RehireEligibility, ShortfallAction } from '../types/exits';
import { Fact, Skeleton } from './parts';

export type ExitAcceptExtra = Record<string, unknown>;

/**
 * The approver's "Accept" form of an exit_review decision: the agreed last working day, what to do with a notice
 * shortfall and the rehire flags. Values go back as `extra` on approve; the server validates them.
 */
export function ExitReviewSection({ caseId, onChange }: { caseId: number; onChange: (value: ExitAcceptExtra | null, valid: boolean) => void }) {
  const [c, setC] = React.useState<ExitCaseDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [lwd, setLwd] = React.useState('');
  const [shortfall, setShortfall] = React.useState<ShortfallAction | null>('recover');
  const [regrettable, setRegrettable] = React.useState<'yes' | 'no' | null>(null);
  const [rehire, setRehire] = React.useState<RehireEligibility | null>(null);
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    api.getExit(caseId).then((d) => { setC(d); setLwd(d.requested_lwd || d.notice_end || ''); }).catch((e) => setError(messageOf(e)));
  }, [caseId]);

  const shortDays = c?.notice_end && lwd ? Math.max(0, daysBetween(lwd, c.notice_end)) : 0;
  const valid = Boolean(lwd) && (shortDays === 0 || Boolean(shortfall));
  React.useEffect(() => {
    onChange(valid ? {
      action: 'accept', agreed_lwd: lwd, shortfall_action: shortDays > 0 ? shortfall : undefined,
      regrettable: regrettable === null ? undefined : regrettable === 'yes',
      rehire_eligibility: rehire ?? undefined, rehire_note: note.trim() || undefined,
    } : null, valid);
  }, [valid, lwd, shortfall, shortDays, regrettable, rehire, note, onChange]);

  if (error) return <Alert message={error} />;
  if (!c) return <Skeleton className="h-40" />;
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        <Fact label="Requested last day" value={formatDate(c.requested_lwd)} />
        <Fact label="Notice ends" value={formatDate(c.notice_end)} />
        <Fact label="Notice period" value={c.notice_days != null ? `${c.notice_days} days` : null} />
      </dl>
      <TextField label="Agreed last working day" required type="date" value={lwd} onChange={setLwd} />
      {shortDays > 0 && (
        <SelectField<ShortfallAction> label={`Notice shortfall: ${shortDays} days`} required value={shortfall} onChange={setShortfall}
          options={(Object.keys(SHORTFALL_LABEL) as ShortfallAction[]).map((k) => ({ value: k, label: SHORTFALL_LABEL[k] }))} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField<'yes' | 'no'> label="Regrettable loss?" value={regrettable} onChange={setRegrettable} placeholder="Not set"
          options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
        <SelectField<RehireEligibility> label="Rehire eligibility" value={rehire} onChange={setRehire} placeholder="Not set"
          options={(Object.keys(REHIRE_LABEL) as RehireEligibility[]).map((k) => ({ value: k, label: REHIRE_LABEL[k] }))} />
      </div>
      <Textarea label="Rehire note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      <p className="text-xs text-fg-muted">
        Want to keep them? Close this and <Link href={`/org-admin/exits/${caseId}`} className="font-semibold text-fg underline">make a counter-offer</Link> instead.
      </p>
    </div>
  );
}
