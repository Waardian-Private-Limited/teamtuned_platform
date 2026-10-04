'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { OpenShift } from '../../../types/roster.types';
import { formatDay } from '../../../utils/rosterTime';

function clock(t?: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function openShiftTime(o: OpenShift): string {
  return o.start_time && o.end_time ? `${clock(o.start_time)} – ${clock(o.end_time)}` : '';
}

interface Props {
  shift: OpenShift;
  onClaim: (id: number) => Promise<unknown>;
  onWithdraw: (claimId: number) => Promise<unknown>;
}

export function OpenShiftCard({ shift, onClaim, onWithdraw }: Props) {
  const [busy, setBusy] = useState(false);
  const claim = shift.claim;
  const eligible = shift.eligible !== false;

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <article className="flex flex-col justify-between gap-3 rounded-xl border border-line bg-surface p-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-fg">{formatDay(shift.work_date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          {shift.is_overtime ? <span className="rounded border border-fg px-1.5 text-[10px] font-bold text-fg">OVERTIME</span> : null}
        </div>
        <p className="mt-1 text-sm text-fg">{shift.shift_name || 'Shift'}</p>
        <p className="text-xs text-fg-muted">{openShiftTime(shift)}</p>
        {shift.unit_name && <p className="mt-1 text-xs text-fg-muted">{shift.unit_name}</p>}
      </div>
      {claim ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-fg">{claim.status === 'approved' ? 'Your claim was approved' : 'Your claim is waiting for approval'}</p>
          {claim.status === 'pending' && (
            <Button variant="secondary" className="!h-9 !w-auto !px-3 !text-[13px]" loading={busy} onClick={() => act(() => onWithdraw(claim.id))}>Withdraw claim</Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Button className="!h-9 !w-full !text-[13px]" disabled={!eligible} loading={busy} onClick={() => act(() => onClaim(shift.id))}>Claim this shift</Button>
          {!eligible && (shift.reasons?.length || 0) > 0 && (
            <ul className="space-y-0.5 text-xs text-fg-muted">
              {shift.reasons?.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
