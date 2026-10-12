'use client';

import { Download } from 'lucide-react';
import { money, monthLabel, shortDate } from '@/features/salary-slips/utils/format';
import type { MyPayslip } from '../../types/myPayslips.model';

interface PayslipCardProps {
  slip: MyPayslip;
  downloading: boolean;
  onDownload: (slip: MyPayslip) => void;
}

function days(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function PayslipCard({ slip, downloading, onDownload }: PayslipCardProps) {
  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-4 shadow-xs transition-shadow hover:shadow-[var(--tt-shadow-md)] 2xl:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-fg sm:text-base">{monthLabel(slip.month)}</h3>
          <p className="mt-0.5 truncate text-xs text-fg-muted">{slip.periodLabel}</p>
        </div>
        {slip.payslipNumber && <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{slip.payslipNumber}</span>}
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Net pay</p>
        <p className="mt-0.5 text-2xl font-extrabold tabular-nums tracking-tight text-fg">{money(slip.netPay)}</p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-xs">
        <div>
          <dt className="text-fg-muted">Company</dt>
          <dd className="mt-0.5 truncate font-semibold text-fg">{slip.companyName || '—'}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">Pay date</dt>
          <dd className="mt-0.5 font-semibold text-fg">{shortDate(slip.payDate)}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">Payable days</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-fg">
            {days(slip.payableDays)}
            {slip.cycleDays > 0 && <span className="font-normal text-fg-muted"> / {days(slip.cycleDays)}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-fg-muted">LOP days</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-fg">{days(slip.lopDays)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => onDownload(slip)}
        disabled={downloading}
        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle active:scale-[0.99] disabled:opacity-50 sm:text-sm"
      >
        {downloading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Download payslip
      </button>
    </article>
  );
}
