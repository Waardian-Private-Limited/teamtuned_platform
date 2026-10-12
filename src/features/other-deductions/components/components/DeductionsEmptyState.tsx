'use client';

import { EmptyState } from '@/components/ui/EmptyState';

interface DeductionsEmptyStateProps {
  filtered: boolean;
  monthText: string;
  canAdd: boolean;
  onAdd: () => void;
  onClear: () => void;
}

const ILLUSTRATION = { src: '/vectors/debits.svg', width: 960, height: 439, alt: 'Other deductions illustration' };

export function DeductionsEmptyState({ filtered, monthText, canAdd, onAdd, onClear }: DeductionsEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6">
      {filtered ? (
        <EmptyState
          illustration={ILLUSTRATION}
          title="No matching deductions"
          description="Nothing matches the current search or status. Try adjusting the filters."
          action={{ label: 'Clear filters', onClick: onClear, variant: 'link' }}
        />
      ) : (
        <EmptyState
          illustration={ILLUSTRATION}
          title={`No deductions for ${monthText}`}
          description="One-off or instalment recoveries such as damages, canteen dues or loans are deducted from salary in payroll."
          action={canAdd ? { label: 'Add deduction', onClick: onAdd } : undefined}
        />
      )}
    </div>
  );
}
