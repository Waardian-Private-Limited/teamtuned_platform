'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import type { AvailabilityRow, OpenShift, SwapRequest } from '../../../types/roster.types';
import type { PendingClaim } from '../../../hooks/useRequests';
import { formatDay, maskToDays } from '../../../utils/rosterTime';
import { WEEKDAYS, ALL_DAYS_MASK } from '../../../constants/roster.constants';
import { SwapCard } from './SwapCard';
import { DecisionDialog } from './DecisionDialog';
import { AssignDialog } from './AssignDialog';
import { openShiftTime } from './OpenShiftCard';

interface Props {
  myId: number | null;
  loading: boolean;
  errors: string[];
  canApprove: boolean;
  canEdit: boolean;
  swaps: SwapRequest[];
  availability: AvailabilityRow[];
  claims: PendingClaim[];
  unfilled: OpenShift[];
  onDecideSwap: (id: number, decision: 'approved' | 'rejected', note?: string) => Promise<string | null>;
  onDecideAvailability: (id: number, decision: 'approved' | 'rejected') => Promise<unknown>;
  onDecideClaim: (id: number, decision: 'approved' | 'rejected') => Promise<unknown>;
  onAssign: (id: number, employeeId: number) => Promise<string | null>;
  onClose: (id: number) => Promise<unknown>;
}

const KIND_TEXT = { unavailable: 'cannot work', avoid: 'would rather not work', prefer: 'would like to work' } as const;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-fg">{title}</h3>
      {children}
    </section>
  );
}

function Pair({ onApprove, onDecline }: { onApprove: () => Promise<unknown>; onDecline: () => Promise<unknown> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const go = async (k: string, fn: () => Promise<unknown>) => {
    setBusy(k);
    await fn();
    setBusy(null);
  };
  return (
    <div className="flex gap-2">
      <Button className="!h-9 !w-auto !px-4 !text-[13px]" loading={busy === 'a'} onClick={() => go('a', onApprove)}>Approve</Button>
      <Button variant="secondary" className="!h-9 !w-auto !px-4 !text-[13px]" loading={busy === 'd'} onClick={() => go('d', onDecline)}>Decline</Button>
    </div>
  );
}

export function ApprovalsTab(p: Props) {
  const [decision, setDecision] = useState<SwapRequest | null>(null);
  const [assigning, setAssigning] = useState<OpenShift | null>(null);
  const [closing, setClosing] = useState<number | null>(null);

  if (p.loading) return <TableSkeleton rows={3} columns={3} />;
  const firstError = p.errors.find(Boolean);
  const empty = p.swaps.length === 0 && p.availability.length === 0 && p.claims.length === 0 && p.unfilled.length === 0;

  const summaryOf = (r: SwapRequest) => `${r.from_name}'s ${r.from_shift_name || 'shift'} on ${formatDay(r.from_date_str, { weekday: 'long', day: 'numeric', month: 'long' })}.`;

  return (
    <div className="space-y-6">
      {firstError && <p className="text-sm font-medium text-[var(--tt-danger)]">{firstError}</p>}
      {empty && !firstError && <EmptyState compact title="Nothing waiting for you" description="Requests that need your decision will show up here." />}

      {p.swaps.length > 0 && (
        <Group title="Shift requests">
          {p.swaps.map((r) => (
            <SwapCard key={r.id} request={r} myId={p.myId} needsMyResponse={false} onDecide={(picked) => setDecision(picked)} />
          ))}
        </Group>
      )}

      {p.canApprove && p.availability.length > 0 && (
        <Group title="Availability requests">
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {p.availability.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-fg">{a.employee_name} {KIND_TEXT[a.kind]}</p>
                  <p className="text-xs text-fg-muted">
                    {formatDay(a.from_date.slice(0, 10))}{a.to_date !== a.from_date ? ` to ${formatDay(a.to_date.slice(0, 10))}` : ''}
                    {a.days_mask !== ALL_DAYS_MASK && ` · ${maskToDays(a.days_mask).map((d) => WEEKDAYS[d]).join(', ')}`}
                  </p>
                  {a.note && <p className="text-xs text-fg-muted">&ldquo;{a.note}&rdquo;</p>}
                </div>
                <Pair onApprove={() => p.onDecideAvailability(a.id, 'approved')} onDecline={() => p.onDecideAvailability(a.id, 'rejected')} />
              </li>
            ))}
          </ul>
        </Group>
      )}

      {p.claims.length > 0 && (
        <Group title="Open shift claims">
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {p.claims.map(({ claim, shift }) => (
              <li key={claim.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-fg">{claim.employee_name} wants to take {shift.shift_name}</p>
                  <p className="text-xs text-fg-muted">
                    {formatDay(shift.work_date, { weekday: 'short', day: 'numeric', month: 'short' })} · {openShiftTime(shift)}{shift.unit_name ? ` · ${shift.unit_name}` : ''}
                  </p>
                </div>
                <Pair onApprove={() => p.onDecideClaim(claim.id, 'approved')} onDecline={() => p.onDecideClaim(claim.id, 'rejected')} />
              </li>
            ))}
          </ul>
        </Group>
      )}

      {p.canEdit && p.unfilled.length > 0 && (
        <Group title="Unfilled open shifts">
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {p.unfilled.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-fg">{s.shift_name} · {s.needed - s.filled} still needed</p>
                  <p className="text-xs text-fg-muted">
                    {formatDay(s.work_date, { weekday: 'short', day: 'numeric', month: 'short' })} · {openShiftTime(s)}{s.unit_name ? ` · ${s.unit_name}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button className="!h-9 !w-auto !px-4 !text-[13px]" onClick={() => setAssigning(s)}>Assign</Button>
                  <Button variant="secondary" className="!h-9 !w-auto !px-4 !text-[13px]" loading={closing === s.id} onClick={async () => { setClosing(s.id); await p.onClose(s.id); setClosing(null); }}>Close</Button>
                </div>
              </li>
            ))}
          </ul>
        </Group>
      )}

      {decision && (
        <DecisionDialog
          approve={decision.status === 'approved'}
          summary={summaryOf(decision)}
          onClose={() => setDecision(null)}
          onConfirm={(note) => p.onDecideSwap(decision.id, decision.status === 'approved' ? 'approved' : 'rejected', note)}
        />
      )}
      {assigning && <AssignDialog shift={assigning} onClose={() => setAssigning(null)} onAssign={p.onAssign} />}
    </div>
  );
}
