'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { STATUS_LABELS } from '../../../constants/roster.constants';
import type { SwapRequest } from '../../../types/roster.types';
import { formatDay } from '../../../utils/rosterTime';
import { ApprovalStepper } from './ApprovalStepper';

interface Props {
  request: SwapRequest;
  myId: number | null;
  needsMyResponse: boolean;
  onCancel?: (id: number) => Promise<unknown>;
  onRespond?: (id: number, decision: 'approved' | 'rejected') => Promise<unknown>;
  onDecide?: (request: SwapRequest) => void;
  showStepper?: boolean;
}

const TYPE_LABEL = { swap: 'Shift swap', give_away: 'Give away', drop_to_open: 'Release to open shifts' } as const;

export function SwapCard({ request, myId, needsMyResponse, onCancel, onRespond, onDecide, showStepper = true }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const mineRequest = request.from_employee_id === myId;
  const who = mineRequest ? 'You' : request.from_name;
  const shift = request.from_shift_name || request.from_shift_code || 'shift';
  const fromDay = formatDay(request.from_date_str, { weekday: 'short', day: 'numeric', month: 'short' });
  const toDay = request.to_date_str ? formatDay(request.to_date_str, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const toWho = request.to_employee_id === myId ? 'your' : `${request.to_name}'s`;

  let summary = '';
  if (request.type === 'swap') summary = `${who === 'You' ? 'Your' : `${who}'s`} ${shift} on ${fromDay} for ${toWho} shift on ${toDay}`;
  else if (request.type === 'give_away') summary = `${who === 'You' ? 'Your' : `${who}'s`} ${shift} on ${fromDay} goes to ${request.to_employee_id === myId ? 'you' : request.to_name}`;
  else summary = `${who === 'You' ? 'Your' : `${who}'s`} ${shift} on ${fromDay} is released to open shifts`;

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    await fn();
    setBusy(null);
  };

  return (
    <article className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{TYPE_LABEL[request.type]} · {request.unit_name}</p>
          <p className="mt-1 text-sm font-bold text-fg">{summary}</p>
          {request.reason && <p className="mt-1 text-xs text-fg-muted">&ldquo;{request.reason}&rdquo;</p>}
        </div>
        <span className="shrink-0 rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-semibold text-fg">{STATUS_LABELS[request.status]}</span>
      </div>

      {showStepper && <ApprovalStepper request={request} />}

      {needsMyResponse && onRespond && (
        <div className="flex gap-2">
          <Button className="!h-9 !w-auto !px-4 !text-[13px]" loading={busy === 'a'} onClick={() => act('a', () => onRespond(request.id, 'approved'))}>Accept</Button>
          <Button variant="secondary" className="!h-9 !w-auto !px-4 !text-[13px]" loading={busy === 'd'} onClick={() => act('d', () => onRespond(request.id, 'rejected'))}>Decline</Button>
        </div>
      )}
      {mineRequest && request.status === 'pending' && onCancel && (
        <Button variant="secondary" className="!h-9 !w-auto !px-3 !text-[13px]" loading={busy === 'c'} onClick={() => act('c', () => onCancel(request.id))}>Cancel request</Button>
      )}
      {onDecide && request.status === 'pending' && (
        request.can_decide ? (
          <div className="flex gap-2">
            <Button className="!h-9 !w-auto !px-4 !text-[13px]" onClick={() => onDecide({ ...request, status: 'approved' })}>Approve</Button>
            <Button variant="secondary" className="!h-9 !w-auto !px-4 !text-[13px]" onClick={() => onDecide({ ...request, status: 'rejected' })}>Decline</Button>
          </div>
        ) : (
          <p className="text-xs text-fg-muted">Waiting for an earlier step before you can decide.</p>
        )
      )}
    </article>
  );
}
