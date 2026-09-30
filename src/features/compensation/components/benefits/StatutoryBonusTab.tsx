'use client';

import React from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Alert } from '@/components/ui/Alert';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import * as api from '../../api/compensation.api';
import { usePagedQuery } from '../../hooks/usePagedQuery';
import type { BonusRowDto, CompensationSettings } from '../../types/compensation.dto';
import { currentFyStart, currentMonth, inr } from '../../utils/format';
import { Btn } from '../shared/Buttons';
import { ConfirmDialog, type ConfirmState } from '../shared/ConfirmDialog';
import { Empty, Panel, Toolbar, td, th } from '../shared/Panel';
import { SearchBox } from '../shared/SearchBox';

export function StatutoryBonusTab({ canAdd, rules }: { canAdd: boolean; rules: CompensationSettings['statutoryBonus'] | null }) {
  const latest = currentFyStart();
  const [fy, setFy] = React.useState(latest - 1);
  const [payoutMonth, setPayoutMonth] = React.useState(currentMonth());
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);

  const q = usePagedQuery<BonusRowDto>(async ({ page, pageSize, search }) => {
    const res = await api.statutoryBonus({ page, pageSize, search, fy });
    return { rows: res.rows, total: res.total, pages: res.pages, extra: { label: res.fy.label } };
  }, [fy]);

  const generate = () => setConfirm({
    title: `Generate statutory bonus FY ${q.extra.label || ''}`,
    body: <>Creates bonus payouts for every eligible employee not already paid for this year, in the {payoutMonth} payroll. Eligible employees earn wages up to {inr(rules?.eligibilityWage)} and worked at least {rules?.minWorkingDays} days.</>,
    cta: 'Generate',
    run: async () => {
      try {
        const res = await api.generateStatutoryBonus({ fy, payout_month: payoutMonth });
        showSuccess(`${res.created} bonus payouts created · ${inr(res.amount)}`);
        await q.reload();
      } catch (err) {
        showError(messageOf(err));
      }
    },
  });

  return (
    <Panel>
      <Toolbar>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBox value={q.searchInput} onChange={q.setSearchInput} placeholder="Search employee…" />
            <select value={fy} onChange={(e) => setFy(Number(e.target.value))} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg sm:text-sm" aria-label="Financial year">
              {Array.from({ length: 5 }, (_, i) => latest - i).map((y) => <option key={y} value={y}>FY {y}-{String((y + 1) % 100).padStart(2, '0')}</option>)}
            </select>
          </div>
          {canAdd && (
            <div className="flex items-center gap-2">
              <input type="month" value={payoutMonth} onChange={(e) => setPayoutMonth(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg sm:text-sm" aria-label="Payout month" />
              <Btn variant="primary" onClick={generate}>Generate payouts</Btn>
            </div>
          )}
        </div>
        {rules && (
          <p className="text-[11px] text-fg-muted sm:text-xs">
            Payment of Bonus Act: {rules.rate}% of wage (capped at {inr(rules.calculationCeiling)}/month) × months worked, for employees with wage up to {inr(rules.eligibilityWage)}. Wage = {rules.wageComponents.length ? rules.wageComponents.join(' + ') : 'Basic component from Payroll Setup'}.
          </p>
        )}
      </Toolbar>
      {q.error && <div className="p-3"><Alert message={q.error} tone="error" /></div>}
      {q.loading ? <TableSkeleton rows={6} columns={5} /> : q.rows.length === 0 ? (
        <Empty title="No employees with salary" text="Statutory bonus is worked out from each employee's salary structure." />
      ) : (
        <div className={cx('min-h-0 flex-1 overflow-auto tt-scroll-hidden', q.fetching && 'opacity-70')}>
          <table className="w-full min-w-[720px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={th}>Employee</th>
                <th className={th}>Wage / month</th>
                <th className={th}>Months</th>
                <th className={th}>Eligibility</th>
                <th className={cx(th, 'text-right')}>Bonus</th>
              </tr>
            </thead>
            <tbody>
              {q.rows.map((r) => (
                <tr key={r.employee.id}>
                  <td className={td}><span className="block font-semibold">{r.employee.name}</span><span className="block text-[11px] text-fg-muted">{r.employee.employee_code}</span></td>
                  <td className={td}>{inr(r.monthly_wage)}</td>
                  <td className={td}>{r.months_counted}</td>
                  <td className={td}><span className={cx('text-xs', r.eligible ? 'text-fg' : 'text-fg-muted')}>{r.already_generated ? 'Already generated' : r.reason}</span></td>
                  <td className={cx(td, 'text-right font-semibold')}>{r.eligible ? inr(r.amount) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.total > 0 && <div className="border-t border-line px-4 py-2.5"><Pagination currentPage={q.page} totalPages={q.pages} totalItems={q.total} pageSize={q.pageSize} onPageChange={q.setPage} onPageSizeChange={q.setPageSize} /></div>}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </Panel>
  );
}
