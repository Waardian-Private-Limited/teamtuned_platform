'use client';

import { EmptyState } from '@/components/ui/EmptyState';
import { ILLUSTRATIONS } from '../../constants/salaryAdvance.constants';
import type { AdvanceListTab } from '../../types/salaryAdvance.model';

const COPY: Record<AdvanceListTab, { title: string; description: string }> = {
  pending: { title: 'Nothing waiting for approval', description: 'New requests from employees appear here until they are approved in Approvals.' },
  to_disburse: { title: 'Nothing to pay out', description: 'Approved advances waiting for Accounts or the next payroll appear here.' },
  active: { title: 'No advances being recovered', description: 'Once an advance is paid out, its instalments are recovered from salary and it shows here.' },
  closed: { title: 'No closed advances yet', description: 'Fully recovered, waived and written off advances are kept here for the record.' },
  all: { title: 'No salary advances yet', description: 'Employees request advances from their app. HR can also create one on an employee’s behalf.' },
};

interface AdvancesEmptyStateProps {
  tab: AdvanceListTab;
  filtered: boolean;
  canCreate: boolean;
  onCreate: () => void;
  onClear: () => void;
}

export function AdvancesEmptyState({ tab, filtered, canCreate, onCreate, onClear }: AdvancesEmptyStateProps) {
  const illustration = tab === 'active' || tab === 'closed' ? ILLUSTRATIONS.debits : ILLUSTRATIONS.credit;
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6">
      {filtered ? (
        <EmptyState
          illustration={illustration}
          title="No matching advances"
          description="Nothing matches the current search or filters. Try adjusting them."
          action={{ label: 'Clear filters', onClick: onClear, variant: 'link' }}
        />
      ) : (
        <EmptyState
          illustration={illustration}
          title={COPY[tab].title}
          description={COPY[tab].description}
          action={canCreate && (tab === 'all' || tab === 'pending') ? { label: 'New advance', onClick: onCreate } : undefined}
        />
      )}
    </div>
  );
}
