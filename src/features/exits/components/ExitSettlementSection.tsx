'use client';

import React from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { inr } from '@/features/compensation/utils/format';
import { formatDate } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/exits.api';
import { PAY_MODE_LABEL } from '../constants/exits.constants';
import type { ExitCaseDetail } from '../types/exits';
import { Fact, Skeleton } from './parts';

/**
 * Read-only settlement summary inside the approvals drawer for an `exit_settlement` request: the lines Finance is
 * approving, the net and the due date, with a link to the full case.
 */
export function ExitSettlementSection({ caseId }: { caseId: number }) {
  const [c, setC] = React.useState<ExitCaseDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => { api.getExit(caseId).then(setC).catch((e) => setError(messageOf(e))); }, [caseId]);
  if (error) return <Alert message={error} />;
  if (!c) return <Skeleton className="h-32" />;
  const s = c.settlement;
  const portal = typeof window !== 'undefined' && window.location.pathname.startsWith('/employee') ? '/employee' : '/org-admin';
  if (!s) return <p className="text-sm text-fg-muted">No settlement found for this case.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-fg"><span className="font-semibold">{c.employee.name}</span> {c.agreed_lwd ? `left on ${formatDate(c.agreed_lwd)}` : ''}</p>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {s.lines.map((l) => (
          <li key={l.id} className="flex items-center gap-3 p-2.5 text-sm">
            <span className="min-w-0 flex-1 break-words text-fg">{l.label}{l.override_reason && <span className="block text-xs text-fg-muted">Overridden: {l.override_reason}</span>}</span>
            <span className="shrink-0 font-semibold tabular-nums text-fg">{l.kind === 'deduction' ? '-' : ''}{inr(l.amount)}</span>
          </li>
        ))}
      </ul>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        <Fact label="Earnings" value={inr(s.total_earnings)} />
        <Fact label="Deductions" value={inr(s.total_deductions)} />
        <Fact label="Net payable" value={inr(s.net_payable)} />
        <Fact label="Payment" value={s.pay_mode ? PAY_MODE_LABEL[s.pay_mode] : null} />
        <Fact label="Due by" value={s.due_on ? formatDate(s.due_on) : null} />
      </dl>
      <Link href={`${portal}/exits/${caseId}`} className="text-sm font-semibold text-fg underline">Open the full case</Link>
    </div>
  );
}
