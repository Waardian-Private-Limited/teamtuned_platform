'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import * as api from '../api/leave.api';
import type { PayrollAdjustment } from '../types/leave';
import { days, fmtDate, todayIso } from '../utils/format';

const STATUS_TEXT: Record<PayrollAdjustment['status'], string> = { proposed: 'Waiting for approval', applied: 'Covered', dismissed: 'Not covered (unpaid)' };

// Absent days that are covered from a leave or comp-off balance, by month. Read only: a cover that needs approval is
// decided in Approvals (Absence cover), by the approvers of its approval flow.
export function PayrollAdjustmentsTab() {
  const [month, setMonth] = React.useState(todayIso().slice(0, 7));
  const [rows, setRows] = React.useState<PayrollAdjustment[] | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setRows(null); setError('');
    api.payrollAdjustments(month).then((r) => setRows(r.adjustments)).catch((e) => { setError(messageOf(e)); setRows([]); });
  }, [month]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-fg">Absences covered from balance</p>
          <p className="text-xs text-fg-muted">Decide the ones waiting for approval under Approvals → Absence cover. Days not covered stay unpaid.</p>
        </div>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg" aria-label="Month" />
      </div>
      {error && <Alert message={error} tone="error" />}
      {!rows && <div className="h-32 animate-pulse rounded-lg bg-bg-subtle" />}
      {rows && rows.length === 0 && !error && <p className="py-8 text-center text-sm text-fg-muted">No absence was covered from a balance this month.</p>}
      {rows && rows.length > 0 && (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-bg-subtle text-xs font-semibold text-fg-muted">
              <tr><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Absent on</th><th className="px-3 py-2">Covered from</th><th className="px-3 py-2 text-right">Days</th><th className="px-3 py-2">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2"><span className="font-semibold text-fg">{r.employee_name}</span>{r.employee_code && <span className="ml-1.5 text-xs text-fg-muted">{r.employee_code}</span>}</td>
                  <td className="px-3 py-2 text-fg">{fmtDate(r.work_date)}{r.slot === 1 ? ' · half day' : ''}</td>
                  <td className="px-3 py-2 text-fg">{r.leave_type_name}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-fg">{days(r.quantity)}</td>
                  <td className="px-3 py-2"><span className={cx('rounded-md border px-1.5 py-0.5 text-[11px] font-semibold', r.status === 'proposed' ? 'border-fg text-fg' : 'border-line text-fg-muted')}>{STATUS_TEXT[r.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
