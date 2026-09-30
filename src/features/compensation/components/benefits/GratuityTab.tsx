'use client';

import React from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Alert } from '@/components/ui/Alert';
import { cx } from '@/theme/tokens';
import * as api from '../../api/compensation.api';
import { usePagedQuery } from '../../hooks/usePagedQuery';
import type { CompensationSettings, GratuityRowDto } from '../../types/compensation.dto';
import { date, inr, today } from '../../utils/format';
import { Empty, Panel, Toolbar, td, th } from '../shared/Panel';
import { SearchBox } from '../shared/SearchBox';
import { GratuityDrawer } from './GratuityDrawer';

export function GratuityTab({ canAdd, rules }: { canAdd: boolean; rules: CompensationSettings['gratuity'] | null }) {
  const [asOf, setAsOf] = React.useState(today());
  const [employeeId, setEmployeeId] = React.useState<number | null>(null);

  const q = usePagedQuery<GratuityRowDto>(async ({ page, pageSize, search }) => {
    const res = await api.gratuityLiability({ page, pageSize, search, as_of: asOf });
    return { rows: res.rows, total: res.total, pages: res.pages };
  }, [asOf]);

  const pageTotals = q.rows.reduce((s, r) => ({ accrued: s.accrued + r.accrued_liability, provision: s.provision + r.monthly_provision }), { accrued: 0, provision: 0 });

  return (
    <Panel>
      <Toolbar>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBox value={q.searchInput} onChange={q.setSearchInput} placeholder="Search employee…" />
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg sm:text-sm" aria-label="As of" />
          </div>
          <p className="text-xs text-fg-muted">This page: accrued <b className="text-fg">{inr(pageTotals.accrued)}</b> · provision <b className="text-fg">{inr(pageTotals.provision)}</b>/month</p>
        </div>
        {rules && (
          <p className="text-[11px] text-fg-muted sm:text-xs">
            Payment of Gratuity Act: last wage ({rules.wageComponents.length ? rules.wageComponents.join(' + ') : 'Basic from Payroll Setup'}) × 15 × years ÷ {rules.divisor}, after {rules.eligibilityYears} years{rules.continuousServiceDays ? ` (or ${rules.eligibilityYears - 1} years + ${rules.continuousServiceDays} days)` : ''}, capped at {inr(rules.cap)}. Part-year over {rules.roundUpAfterMonths} months counts as a full year.
          </p>
        )}
      </Toolbar>
      {q.error && <div className="p-3"><Alert message={q.error} tone="error" /></div>}
      {q.loading ? <TableSkeleton rows={6} columns={6} /> : q.rows.length === 0 ? (
        <Empty title="No employees with salary" text="Gratuity liability is worked out from joining date and last drawn wage." />
      ) : (
        <div className={cx('min-h-0 flex-1 overflow-auto tt-scroll-hidden', q.fetching && 'opacity-70')}>
          <table className="w-full min-w-[820px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={th}>Employee</th>
                <th className={th}>Joined</th>
                <th className={th}>Service</th>
                <th className={th}>Wage</th>
                <th className={cx(th, 'text-right')}>Payable if exits</th>
                <th className={cx(th, 'text-right')}>Accrued liability</th>
                <th className={cx(th, 'text-right')}>Provision / month</th>
              </tr>
            </thead>
            <tbody>
              {q.rows.map((r) => (
                <tr key={r.employee.id} className="cursor-pointer hover:bg-bg-subtle/50" onClick={() => setEmployeeId(r.employee.id)}>
                  <td className={td}><span className="block font-semibold">{r.employee.name}</span><span className="block text-[11px] text-fg-muted">{r.employee.employee_code}</span></td>
                  <td className={td}>{date(r.joining_date)}</td>
                  <td className={td}>{r.service.years}y {r.service.months}m</td>
                  <td className={td}>{inr(r.monthly_wage)}</td>
                  <td className={cx(td, 'text-right font-semibold')}>{r.eligible ? inr(r.payable_today) : <span className="text-xs font-normal text-fg-muted">Not yet eligible</span>}</td>
                  <td className={cx(td, 'text-right')}>{inr(r.accrued_liability)}</td>
                  <td className={cx(td, 'text-right')}>{inr(r.monthly_provision)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.total > 0 && <div className="border-t border-line px-4 py-2.5"><Pagination currentPage={q.page} totalPages={q.pages} totalItems={q.total} pageSize={q.pageSize} onPageChange={q.setPage} onPageSizeChange={q.setPageSize} /></div>}
      <GratuityDrawer employeeId={employeeId} canAdd={canAdd} onClose={() => setEmployeeId(null)} onCreated={q.reload} />
    </Panel>
  );
}
