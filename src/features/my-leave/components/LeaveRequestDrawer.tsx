'use client';

import React from 'react';
import { Paperclip, Undo2, XCircle } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/features/detailed-attendance/components/components/controls';
import { showSuccess } from '@/lib/toast';
import { DAY_KIND } from '../constants/leave.constants';
import { useLeaveRequest } from '../hooks/useLeaveRequest';
import { dateTimeText, daysText, shortDate } from '../utils/format';
import { datesText, daysLine, StatusBadge, TypeDot } from './LeaveParts';
import { LeaveTimeline } from './LeaveTimeline';

function Fact({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cx('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-fg">{children}</dd>
    </div>
  );
}

const slotText = (slot: number) => (slot === 1 ? 'first half' : slot === 2 ? 'second half' : '');

/**
 * One of the employee's own requests: what it covers day by day, what it takes from the balance, its
 * approval story, and withdrawing it while pending or cancelling it before it starts.
 */
export function LeaveRequestDrawer({ id, today, onClose, onChanged }: { id: number | null; today: string; onClose: () => void; onChanged: () => void }) {
  const r = useLeaveRequest(id);
  const d = r.detail;
  const [asking, setAsking] = React.useState(false);
  const [reason, setReason] = React.useState('');

  const withdrawable = d?.status === 'pending';
  const cancellable = d?.status === 'approved' && d.startDate > today;
  const actionLabel = withdrawable ? 'Withdraw request' : 'Cancel leave';

  const confirm = async () => {
    if (await r.cancel(reason)) {
      showSuccess(withdrawable ? 'Request withdrawn' : 'Leave cancelled');
      setAsking(false);
      setReason('');
      onChanged();
    }
  };

  return (
    <Drawer open={id !== null} onClose={onClose} title={d ? d.type.name : 'Leave request'} maxWidthClassName="sm:max-w-2xl xl:max-w-4xl">
      {r.error && <Alert message={r.error} />}
      {!d && !r.error && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]" aria-busy="true">
          <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}<Skeleton className="h-24 sm:col-span-2" /></div>
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        </div>
      )}
      {d && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <TypeDot color={d.type.color} />
              <span className="text-base font-bold text-fg">{datesText(d)}</span>
              <StatusBadge status={d.status} />
            </div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Fact label="Days">{daysLine(d)}</Fact>
              <Fact label="Applied">{dateTimeText(d.createdAt)}{d.addedByHr ? ' · by HR' : ''}</Fact>
              {d.reason && <Fact label="Reason" wide>{d.reason}</Fact>}
              {d.rejectionReason && <Fact label="Why it was rejected" wide>{d.rejectionReason}</Fact>}
              {d.cancelReason && <Fact label="Why it was cancelled" wide>{d.cancelReason}</Fact>}
              {d.attachmentUrl && (
                <Fact label="Document">
                  <a href={d.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--tt-primary)] hover:underline"><Paperclip className="h-3.5 w-3.5" />View file</a>
                </Fact>
              )}
            </dl>

            {d.impact.length > 0 && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">From your balance</h3>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {d.impact.map((i) => (
                    <li key={i.name} className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-fg">
                      {i.name} · {daysText(i.held || i.used)}{i.held ? ' reserved' : ''}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {d.dayList.length > 0 && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Day by day</h3>
                <ul className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {d.dayList.map((x, i) => (
                    <li key={`${x.date}-${x.slot}-${i}`} className={cx('rounded-lg border px-2.5 py-1.5 text-xs', x.kind === 'working' ? 'border-line text-fg' : 'border-dashed border-line text-fg-muted')}>
                      <span className="font-semibold">{shortDate(x.date)}</span>{slotText(x.slot) ? ` · ${slotText(x.slot)}` : ''}
                      <span className="block text-[11px] text-fg-muted">{x.kind === 'working' ? (x.isLop ? 'Unpaid' : daysText(x.charged)) : DAY_KIND[x.kind] ?? x.kind}{x.kind !== 'working' && x.charged ? ` · ${daysText(x.charged)}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="min-w-0 xl:border-l xl:border-line xl:pl-5">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Timeline</h3>
            {r.timeline ? <LeaveTimeline timeline={r.timeline} /> : <p className="text-sm text-fg-muted">{d.status === 'approved' ? 'Approved without an approval step.' : 'No approval steps.'}</p>}
          </div>
        </div>
      )}
      {(withdrawable || cancellable) && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={() => setAsking(true)}>
            <span className="inline-flex items-center gap-1.5">{withdrawable ? <Undo2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{actionLabel}</span>
          </Button>
        </div>
      )}

      <Dialog open={asking} onClose={() => setAsking(false)} title={actionLabel}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setAsking(false)}>Keep it</Button>
            <Button variant="danger" onClick={confirm} loading={r.busy}>{actionLabel}</Button>
          </>
        )}>
        <p className="mb-3 text-sm text-fg-muted">{withdrawable ? 'The days held for this request go back to your balance.' : 'The days go back to your balance.'}</p>
        <Textarea label="Reason (optional)" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Dialog>
    </Drawer>
  );
}
