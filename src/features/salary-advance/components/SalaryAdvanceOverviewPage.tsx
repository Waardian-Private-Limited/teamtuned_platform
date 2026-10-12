'use client';

import Link from 'next/link';
import { List } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { MonthStepper } from '@/features/salary-slips/components/components/MonthStepper';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { SALARY_ADVANCE_PERMISSIONS } from '../constants/salaryAdvance.constants';
import { useOverview } from '../hooks/useOverview';
import { useSalaryAdvanceBasePath } from '../hooks/useSalaryAdvanceBasePath';
import { KpiTiles } from './components/KpiTiles';
import { TrendChart } from './components/TrendChart';
import { DueNextPayrollCard, QuickLinks } from './components/OverviewSideCards';
import { NoAccess } from './components/NoAccess';

export function SalaryAdvanceOverviewPage() {
  const { can } = usePermission();
  const base = useSalaryAdvanceBasePath();
  const allowed = can(SALARY_ADVANCE_PERMISSIONS.VIEW);
  if (!allowed) return <NoAccess what="salary advances" />;
  return <Overview base={base} canTypes={can(SALARY_ADVANCE_PERMISSIONS.POLICY)} />;
}

function Overview({ base, canTypes }: { base: string; canTypes: boolean }) {
  const o = useOverview();
  const listHref = (status: string) => {
    const q = new URLSearchParams({ status });
    if (o.subOrgId) q.set('subOrgId', String(o.subOrgId));
    return `${base}/advances?${q.toString()}`;
  };

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 pb-8">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5 2xl:p-4">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Salary advance</h1>
          <p className="text-xs text-fg-muted sm:text-sm">Advances and loans paid out, what is still owed, and what payroll recovers next.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SubOrgFilter value={o.subOrgId} onChange={o.setSubOrgId} />
          <MonthStepper value={o.month} onChange={o.setMonth} />
          <Link
            href={`${base}/advances`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm 2xl:h-10"
          >
            <List className="h-3.5 w-3.5" />
            All advances
          </Link>
        </div>
      </div>

      {o.error && <p role="alert" className="px-1 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{o.error}</p>}

      <div className={cx('flex flex-col gap-3 transition-opacity duration-200', o.isFetching && !o.isLoading ? 'opacity-70' : 'opacity-100')}>
        <KpiTiles kpis={o.data?.kpis ?? null} month={o.month} loading={o.isLoading} listHref={listHref} />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <TrendChart trend={o.data?.trend ?? null} loading={o.isLoading} />
          <div className="flex flex-col gap-3">
            <DueNextPayrollCard due={o.data?.dueNextPayroll ?? null} loading={o.isLoading} href={listHref('active')} />
            <QuickLinks listHref={listHref} typesHref={canTypes ? `${base}/types` : null} counts={o.data?.kpis ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
}
