'use client';

import { ChevronDown } from 'lucide-react';
import type { PayRun } from '../../types/salarySlips.model';
import { RUN_STATUS_LABEL } from '../../constants/salarySlips.constants';
import { MonthStepper } from './MonthStepper';

interface SalarySlipsToolbarProps {
  month: string;
  onMonthChange: (month: string) => void;
  runs: PayRun[];
  runId: number | null;
  onRunChange: (id: number) => void;
  total: number | null;
}

export function SalarySlipsToolbar({ month, onMonthChange, runs, runId, onRunChange, total }: SalarySlipsToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4">
      <div className="flex items-center gap-2 sm:gap-2.5">
        <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Salary Slips</h1>
        {total !== null && (
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">
            {total}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
        <MonthStepper value={month} onChange={onMonthChange} />
        {runs.length > 1 && (
          <div className="relative w-full sm:w-64 2xl:w-72">
            <select
              value={runId ?? ''}
              onChange={(e) => onRunChange(Number(e.target.value))}
              aria-label="Paying company"
              className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-xs font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-sm 2xl:h-10 2xl:text-base"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.companyName} · {RUN_STATUS_LABEL[r.status]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
          </div>
        )}
      </div>
    </div>
  );
}
