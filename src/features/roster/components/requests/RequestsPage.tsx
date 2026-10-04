'use client';

import { useState } from 'react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { heading, text } from '@/theme/tokens';
import { useRequests } from '../../hooks/useRequests';
import { MyRequestsTab } from './components/MyRequestsTab';
import { OpenShiftsTab } from './components/OpenShiftsTab';
import { ApprovalsTab } from './components/ApprovalsTab';

type Tab = 'mine' | 'open' | 'approvals';

export function RequestsPage() {
  const r = useRequests();
  const [tab, setTab] = useState<Tab>('mine');

  const suffix = (n: number) => (n > 0 ? ` (${n})` : '');
  const options: { value: Tab; label: string }[] = [
    { value: 'mine', label: `My requests${suffix(r.counts.mine)}` },
    { value: 'open', label: `Open shifts${suffix(r.counts.open)}` },
  ];
  if (r.showApprovals) options.push({ value: 'approvals', label: `Approvals${suffix(r.counts.approvals)}` });
  const active: Tab = tab === 'approvals' && !r.showApprovals ? 'mine' : tab;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-6">
      <div>
        <h1 className={heading.md}>Requests</h1>
        <p className={text.body}>Shift swaps, open shifts and approvals in one place.</p>
      </div>
      <SegmentedControl options={options} value={active} onChange={setTab} className="w-full sm:max-w-md" />

      {active === 'mine' && (
        <MyRequestsTab
          requests={r.mySwaps}
          loading={r.loading.mine}
          error={r.errors.mine}
          myId={r.myId}
          needsMyResponse={r.needsMyResponse}
          onCancel={r.cancel}
          onRespond={(id, decision) => r.respond(id, decision)}
        />
      )}
      {active === 'open' && (
        <OpenShiftsTab shifts={r.openShifts} loading={r.loading.open} error={r.errors.open} onClaim={r.claim} onWithdraw={r.withdraw} />
      )}
      {active === 'approvals' && (
        <ApprovalsTab
          myId={r.myId}
          loading={r.loading.approvals}
          errors={[r.errors.approvals, r.errors.availability, r.errors.manage]}
          canApprove={r.canApprove}
          canEdit={r.canEdit}
          swaps={r.approvalSwaps}
          availability={r.availabilityItems}
          claims={r.claimsToDecide}
          unfilled={r.unfilled}
          onDecideSwap={r.decide}
          onDecideAvailability={r.decideAvailabilityItem}
          onDecideClaim={r.decideClaimItem}
          onAssign={r.assign}
          onClose={r.close}
        />
      )}
    </div>
  );
}
