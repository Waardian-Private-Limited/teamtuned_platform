'use client';

import React from 'react';
import { Paperclip, X } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { controlClass, Skeleton } from '@/features/detailed-attendance/components/components/controls';
import { KIND_TEXT } from '../constants/regularization.constants';
import { useRegularize } from '../hooks/useRegularize';
import { isTimeKind } from '../types/regularization.model';
import { BlockedNote, ChoiceTile, PolicyLine, RecordedCard, RequestCard } from './RegularizeParts';

interface Props {
  date: string;
  onClose: () => void;
  /** Called once a request was raised or withdrawn, so the day and the month can be read again. */
  onDone: () => void;
}

const MAX_PROOF_BYTES = 6 * 1024 * 1024;

function TimeField({ label, value, recorded, onChange }: { label: string; value: string; recorded: string | null; onChange: (v: string) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}{recorded && recorded !== value ? <span className="ml-1.5 font-medium normal-case line-through">{recorded}</span> : null}</span>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className={controlClass} />
    </label>
  );
}

/**
 * Fixing a day's attendance. The server supplies everything that is a rule (whether it is allowed, how
 * far back, until when, how many are left, which fixes apply to this day), so this only shows it and
 * collects the employee's answer. It is only ever about the signed-in employee.
 */
export function RegularizeDialog({ date, onClose, onDone }: Props) {
  const r = useRegularize(date);
  const o = r.options;
  const pending = o?.request?.status === 'pending';
  const open = !!o && o.eligible && !pending;
  const [proofError, setProofError] = React.useState<string | null>(null);

  const timeKinds = o ? o.kinds.filter(isTimeKind) : [];
  const waivers = o ? o.kinds.filter((k) => !isTimeKind(k)) : [];
  const offDay = !!o && o.day.dayType !== 'working' && o.kinds.includes('missed_both');
  const startsAt = r.needsIn ? r.inTime : o?.day.recordedIn ?? '';
  const overnight = r.needsOut && r.outTime !== '' && startsAt !== '' && r.outTime <= startsAt;

  const pick = (file: File | null) => {
    if (file && file.size > MAX_PROOF_BYTES) { setProofError('The file is larger than 6 MB.'); return; }
    setProofError(null);
    r.setFile(file);
  };

  const send = async () => { if (await r.submit()) onDone(); };
  const withdraw = async () => { if (await r.withdraw()) onDone(); };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Regularize attendance"
      maxWidthClassName="max-w-lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>{open ? 'Cancel' : 'Close'}</Button>
          {open && <Button onClick={send} disabled={!r.canSubmit} loading={r.busy} loadingLabel="Sending…">{o!.policy.needsApproval ? 'Send request' : 'Apply now'}</Button>}
        </>
      )}
    >
      {r.loadError && <Alert message={r.loadError} />}
      {r.loading && !o ? (
        <div className="space-y-3" aria-busy="true"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-10" /><Skeleton className="h-40 rounded-xl" /></div>
      ) : o ? (
        <div className="space-y-4">
          <RecordedCard options={o} />
          <PolicyLine options={o} />
          <Alert message={r.error ?? undefined} />

          {pending && o.request && (
            <>
              <RequestCard request={o.request} />
              <div className="flex justify-end"><Button variant="secondary" onClick={withdraw} loading={r.busy}>Withdraw request</Button></div>
            </>
          )}

          {!pending && !o.eligible && (
            <>
              {o.request && <RequestCard request={o.request} />}
              <BlockedNote code={o.blockedReason} />
            </>
          )}

          {open && (
            <>
              {o.request && <RequestCard request={o.request} />}
              {timeKinds.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-bold text-fg">What happened?</h3>
                  {offDay && <p className="mb-2 text-sm text-fg-muted">Worked on a day off? Add your time and it will be counted.</p>}
                  <div role="radiogroup" aria-label="What happened" className="space-y-2">
                    {timeKinds.map((k) => <ChoiceTile key={k} label={KIND_TEXT[k]} selected={r.kinds.includes(k)} onClick={() => r.toggle(k)} />)}
                  </div>
                  {(r.needsIn || r.needsOut) && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {r.needsIn && <TimeField label="Check-in time" value={r.inTime} recorded={o.day.recordedIn} onChange={r.setInTime} />}
                      {r.needsOut && <TimeField label="Check-out time" value={r.outTime} recorded={o.day.recordedOut} onChange={r.setOutTime} />}
                    </div>
                  )}
                  {overnight && <p className="mt-1.5 text-xs text-fg-muted">Check-out falls on the next day</p>}
                </section>
              )}

              {waivers.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-bold text-fg">Also remove</h3>
                  <ul className="space-y-2">
                    {waivers.map((k) => (
                      <li key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                        <span className="text-sm text-fg">{KIND_TEXT[k]}</span>
                        <Switch label={KIND_TEXT[k]} checked={r.kinds.includes(k)} onChange={() => r.toggle(k)} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <Textarea label="Reason" required maxLength={255} value={r.reason} onChange={(e) => r.setReason(e.target.value)} />

              <div>
                {r.file ? (
                  <p className="flex items-center gap-2 text-sm text-fg"><Paperclip aria-hidden className="h-4 w-4 text-fg-muted" /><span className="min-w-0 flex-1 truncate">{r.file.name}</span>
                    <button type="button" aria-label="Remove file" onClick={() => pick(null)} className="rounded p-1 text-fg-muted hover:bg-bg-subtle"><X className="h-4 w-4" /></button></p>
                ) : (
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-fg-muted hover:text-fg">
                    <Paperclip aria-hidden className="h-4 w-4" /> Add proof (optional)
                    <input type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = ''; }} />
                  </label>
                )}
                {proofError && <p className="mt-1 text-xs text-[var(--tt-danger)]">{proofError}</p>}
              </div>
            </>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
