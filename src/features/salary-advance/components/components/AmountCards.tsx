'use client';

import { INTEREST_LABEL } from '../../constants/salaryAdvance.constants';
import type { AdvanceDetail } from '../../types/salaryAdvance.model';
import { money } from '../../utils/format';
import { RecoveryProgress } from './StatusBadges';

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-3.5 shadow-[var(--tt-shadow-sm)] sm:p-4">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1.5 truncate text-lg font-extrabold tabular-nums text-fg sm:text-xl">{value}</p>
      {note && <p className="mt-1 truncate text-[11px] text-fg-muted sm:text-xs">{note}</p>}
    </div>
  );
}

export function AmountCards({ detail }: { detail: AdvanceDetail }) {
  const d = detail;
  const paidOut = d.status === 'active' || d.status === 'closed' || d.status === 'written_off';
  const requestedNote = d.approvedAmount !== null && d.approvedAmount !== d.requestedAmount ? `Requested ${money(d.requestedAmount)}` : undefined;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label={d.approvedAmount !== null ? 'Approved' : 'Requested'} value={money(d.amount)} note={requestedNote} />
        <Stat
          label="Interest"
          value={money(d.interestAmount)}
          note={d.interestMode === 'none' ? 'No interest' : `${INTEREST_LABEL[d.interestMode]} · ${d.interestRate}% a year`}
        />
        <Stat label="Total repayable" value={money(d.totalRepayable)} note={`${d.installments} × ${money(d.installmentAmount)}`} />
        <Stat label="Recovered" value={money(d.recovered)} note={paidOut ? `${Math.round(d.progress)}% of total` : 'Not paid out yet'} />
        <Stat label="Outstanding" value={money(d.outstanding)} note={d.nextDue ? `Next ${money(d.nextDue.amount)}` : undefined} />
      </div>
      {paidOut && <RecoveryProgress progress={d.progress} className="h-2" />}
    </div>
  );
}
