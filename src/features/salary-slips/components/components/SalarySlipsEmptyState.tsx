'use client';

import { EmptyState } from '@/components/ui/EmptyState';

interface SalarySlipsEmptyStateProps {
  variant: 'no-run' | 'no-items' | 'filtered';
  monthText: string;
  onClear?: () => void;
}

const ILLUSTRATION = { src: '/vectors/credit.svg', width: 960, height: 660, alt: 'Salary slips illustration' };

export function SalarySlipsEmptyState({ variant, monthText, onClear }: SalarySlipsEmptyStateProps) {
  const copy =
    variant === 'no-run'
      ? {
          title: `No payroll for ${monthText}`,
          description: 'Salary slips appear here once payroll has been run for the month. Pick another month or start the run from Payroll.',
        }
      : variant === 'no-items'
        ? { title: 'No salary slips in this run', description: 'This payroll run has no calculated employees yet.' }
        : { title: 'No matching salary slips', description: 'No employees match the current search or site. Try adjusting the filters.' };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6">
      <EmptyState
        illustration={ILLUSTRATION}
        title={copy.title}
        description={copy.description}
        action={variant === 'filtered' && onClear ? { label: 'Clear filters', onClick: onClear, variant: 'link' } : undefined}
      />
    </div>
  );
}
