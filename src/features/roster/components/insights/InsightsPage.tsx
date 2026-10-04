'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Button } from '@/components/ui/Button';
import { TeamsEmptyState } from '../teams/components/TeamsEmptyState';
import { heading, text } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { ROSTER_PERMISSIONS } from '../../constants/roster.constants';
import { useInsights } from '../../hooks/useInsights';
import { InsightsFilters } from './components/InsightsFilters';
import { TotalsTiles } from './components/TotalsTiles';
import { FairnessPanel } from './components/FairnessPanel';
import { CoverageChart } from './components/CoverageChart';
import { EmployeeTable } from './components/EmployeeTable';

export function InsightsPage() {
  const { can } = usePermission();
  const i = useInsights();

  if (!can(ROSTER_PERMISSIONS.VIEW)) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
        <EmptyState title="You don't have access to insights" description="Ask an administrator to give you roster view access." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6">
      <div>
        <h1 className={heading.md}>Insights</h1>
        <p className={text.body}>See how work, nights and weekends are shared across a team.</p>
      </div>

      <InsightsFilters
        units={i.units}
        unitId={i.unitId}
        onUnit={i.setUnitId}
        mode={i.mode}
        onMode={i.setMode}
        month={i.month}
        onMonth={i.setMonth}
        from={i.customFrom}
        onFrom={i.setCustomFrom}
        to={i.customTo}
        onTo={i.setCustomTo}
        rangeError={i.rangeError}
      />

      {i.unitsError ? (
        <p className="text-sm font-medium text-[var(--tt-danger)]">{i.unitsError}</p>
      ) : i.unitsLoading || i.loading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : i.units.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <TeamsEmptyState
            title="Create a team first"
            description="Create a team with its members and shifts first, then its roster insights will show here."
            action={
              <Link
                href="/employee/roster/teams"
                className="mt-3.5 sm:mt-4 2xl:mt-6 inline-flex h-9 sm:h-9.5 2xl:h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 2xl:px-6 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm 2xl:text-base"
              >
                Go to teams
              </Link>
            }
          />
        </div>
      ) : i.error ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--tt-danger)]">{i.error}</p>
          <Button variant="secondary" className="!h-9 !w-auto !px-3 !text-[13px]" onClick={() => void i.reload()}>Try again</Button>
        </div>
      ) : i.data ? (
        <>
          <TotalsTiles totals={i.data.totals} />
          <FairnessPanel insights={i.data} />
          <EmployeeTable
            rows={i.rows}
            all={i.data.employees}
            search={i.search}
            onSearch={i.setSearch}
            sortKey={i.sortKey}
            sortDir={i.sortDir}
            onSort={i.toggleSort}
            onExport={i.exportCsv}
          />
          <CoverageChart days={i.data.days} />
        </>
      ) : null}
    </div>
  );
}
