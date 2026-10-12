'use client';

import { EmptyState } from '@/components/ui/EmptyState';

export function MyPayslipsEmptyState({ year }: { year: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-line bg-surface p-4 sm:p-6">
      <EmptyState
        illustration={{ src: '/vectors/credit.svg', width: 960, height: 660, alt: 'Payslips illustration' }}
        title={`No payslips for ${year}`}
        description="Your payslips appear here once your employer releases them after each payroll."
      />
    </div>
  );
}
