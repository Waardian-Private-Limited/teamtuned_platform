import { money, monthLabel, recoveryText } from '../../utils/format';
import type { PlanRecovery } from '../../types/insurance.types';

interface PremiumSummaryProps {
  annual: number;
  employer: number;
  employee: number;
  recovery: Pick<PlanRecovery, 'mode' | 'installments'> & { calendarMonths?: number[] };
  schedule?: Array<{ month_key: string; amount: number; status?: string }>;
  note?: string;
}

/** Who pays what, and the months the employee share comes out of salary. */
export function PremiumSummary({ annual, employer, employee, recovery, schedule, note }: PremiumSummaryProps) {
  return (
    <div className="rounded-xl border border-line bg-bg-subtle p-4">
      <dl className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <dt className="text-fg-muted">Premium</dt>
          <dd className="text-sm font-bold tabular-nums text-fg">{money(annual)}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">Company</dt>
          <dd className="text-sm font-bold tabular-nums text-fg">{money(employer)}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">Employee</dt>
          <dd className="text-sm font-bold tabular-nums text-fg">{money(employee)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-fg-muted">{employee > 0 ? `Employee share: ${recoveryText(recovery.mode, recovery.installments, recovery.calendarMonths).toLowerCase()} through payroll.` : 'Nothing is deducted from salary.'}</p>
      {schedule && schedule.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          {schedule.map((s) => (
            <li key={s.month_key} className="flex items-center justify-between gap-2 border-b border-line py-1">
              <span className="text-fg-muted">{monthLabel(s.month_key)}</span>
              <span className="font-semibold tabular-nums text-fg">
                {money(s.amount)}
                {s.status === 'deducted' && <span className="ml-1 text-[10px] font-medium text-[var(--tt-success)]">paid</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="mt-2 text-[11px] text-fg-muted">{note}</p>}
    </div>
  );
}
