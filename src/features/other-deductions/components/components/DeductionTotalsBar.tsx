import { money } from '@/features/salary-slips/utils/format';

interface DeductionTotalsBarProps {
  monthText: string;
  count: number;
  amount: number;
  paid: number;
}

export function DeductionTotalsBar({ monthText, count, amount, paid }: DeductionTotalsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-b border-line bg-bg-subtle/60 px-4 py-2.5 text-xs sm:text-sm">
      <span className="text-fg-muted">
        {monthText}
      </span>
      <span className="text-fg-muted">
        <span className="font-semibold text-fg tabular-nums">{count}</span> deduction{count === 1 ? '' : 's'}
      </span>
      <span className="text-fg-muted">
        Total <span className="font-semibold text-fg tabular-nums">{money(-amount)}</span>
      </span>
      {paid > 0 && (
        <span className="text-fg-muted">
          Recovered in payroll <span className="font-semibold text-fg tabular-nums">{money(-paid)}</span>
        </span>
      )}
    </div>
  );
}
