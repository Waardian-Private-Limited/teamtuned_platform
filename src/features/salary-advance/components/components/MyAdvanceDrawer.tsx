'use client';

import React from 'react';
import { XCircle } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { useAdvanceActions } from '../../hooks/useAdvanceActions';
import { useAdvanceDetail } from '../../hooks/useAdvanceDetail';
import { money } from '../../utils/format';
import { AdvanceTimeline } from './AdvanceTimeline';
import { AttachmentsList } from './AttachmentsList';
import { DetailFacts } from './DetailSections';
import { ScheduleTable } from './ScheduleTable';
import { CancelAdvanceDialog } from './SettlementDialogs';
import { AdvanceStatusPill, Block, RecoveryProgress } from './StatusBadges';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</h3>
      {children}
    </section>
  );
}

export function MyAdvanceDrawer({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged: () => void }) {
  const { detail, isLoading, error, refetch } = useAdvanceDetail(id, 'me');
  const [cancelling, setCancelling] = React.useState(false);
  const done = React.useCallback(() => {
    setCancelling(false);
    refetch();
    onChanged();
  }, [refetch, onChanged]);
  const actions = useAdvanceActions(id, done);
  const d = detail;
  const paidOut = d && (d.status === 'active' || d.status === 'closed' || d.status === 'written_off');
  const canCancel = d && (d.can.cancel || d.status === 'pending');

  return (
    <Drawer open={id !== null} onClose={onClose} title={d ? d.typeName : 'Advance'} maxWidthClassName="sm:max-w-xl">
      {isLoading ? (
        <div className="space-y-3">
          <Block className="h-20 w-full" />
          <Block className="h-40 w-full" />
          <Block className="h-32 w-full" />
        </div>
      ) : !d ? (
        <p role="alert" className="text-sm font-medium text-[var(--tt-danger)]">{error || 'Could not load this advance.'}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-line bg-bg-subtle/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-extrabold tabular-nums text-fg">{money(d.amount)}</p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {d.installments} × {money(d.installmentAmount)}
                  {d.interestAmount > 0 ? ` · ${money(d.interestAmount)} interest` : ''}
                </p>
              </div>
              <AdvanceStatusPill status={d.status} />
            </div>
            {paidOut && (
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-semibold tabular-nums text-fg">{money(d.recovered)} repaid</span>
                  <span className="tabular-nums text-fg-muted">{money(d.outstanding)} left</span>
                </div>
                <RecoveryProgress progress={d.progress} className="h-2" />
              </div>
            )}
          </div>

          {canCancel && (
            <div className="flex justify-end">
              <Btn icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => { actions.clearError(); setCancelling(true); }}>
                Cancel request
              </Btn>
            </div>
          )}

          <Section title="Schedule">
            {d.schedule.length ? (
              <div className="overflow-hidden rounded-xl border border-line">
                <ScheduleTable rows={d.schedule} payrollHref={null} />
              </div>
            ) : (
              <p className="text-sm text-fg-muted">Your repayment schedule appears once the advance is paid out.</p>
            )}
          </Section>

          <Section title="Details">
            <DetailFacts detail={d} />
          </Section>

          {(d.attachments.length > 0 || d.hasProof) && (
            <Section title="Documents">
              <AttachmentsList advanceId={d.id} attachments={d.attachments} hasProof={d.hasProof} disbursementReference={d.disbursementReference} />
            </Section>
          )}

          <Section title="Timeline">
            <AdvanceTimeline detail={d} />
          </Section>

          <CancelAdvanceDialog advance={d} open={cancelling} busy={actions.busy} error={actions.error} mine onClose={() => setCancelling(false)} onSubmit={() => actions.cancelMine()} />
        </div>
      )}
    </Drawer>
  );
}
