'use client';

import React from 'react';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { useSummary } from '../hooks/useInsuranceData';
import { day, money } from '../utils/format';

function Tile({ label, value, hint, onClick }: { label: string; value: React.ReactNode; hint?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-surface p-4 text-left shadow-[var(--tt-shadow-sm)] sm:p-5"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{label}</span>
      <span className="text-2xl font-extrabold tabular-nums text-fg">{value}</span>
      {hint && <span className="text-xs text-fg-muted">{hint}</span>}
    </Tag>
  );
}

interface OverviewTabProps {
  subOrgId: number | null;
  onSubOrgChange: (id: number | null) => void;
  version: number;
  onOpenPlan: (planId: number) => void;
  onOpenCoverage: () => void;
}

export function OverviewTab({ subOrgId, onSubOrgChange, version, onOpenPlan, onOpenCoverage }: OverviewTabProps) {
  const { data, isLoading, error, refetch } = useSummary(subOrgId);
  React.useEffect(() => {
    if (version > 0) refetch();
  }, [version, refetch]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end"><SubOrgFilter value={subOrgId} onChange={onSubOrgChange} /></div>
      {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>}
      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl border border-line bg-bg-subtle" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Active plans" value={data.active_plans} />
            <Tile label="Employees covered" value={data.covered_employees} hint={`${data.dependents} family members`} onClick={onOpenCoverage} />
            <Tile label="Not covered" value={data.uncovered_employees} hint="Active employees with no cover" />
            <Tile label="Ending in 30 days" value={data.ending_soon} hint="Covers to renew" onClick={onOpenCoverage} />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
              <h3 className="text-sm font-bold text-fg sm:text-base">Premium for active covers</h3>
              <dl className="mt-3 grid grid-cols-2 gap-4">
                <div><dt className="text-xs text-fg-muted">Company pays</dt><dd className="text-xl font-extrabold tabular-nums text-fg">{money(data.premium_employer)}</dd></div>
                <div><dt className="text-xs text-fg-muted">Employees pay</dt><dd className="text-xl font-extrabold tabular-nums text-fg">{money(data.premium_employee)}</dd></div>
              </dl>
              <p className="mt-3 text-[11px] text-fg-muted">Employee share comes out of salary in payroll.</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
              <h3 className="text-sm font-bold text-fg sm:text-base">Plans ending soon</h3>
              {data.plans_ending_soon.length === 0 ? (
                <p className="mt-3 text-xs text-fg-muted">No plan ends in the next 30 days.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {data.plans_ending_soon.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => onOpenPlan(p.id)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-xs hover:text-fg">
                        <span className="min-w-0 truncate font-semibold text-fg">{p.name}</span>
                        <span className="shrink-0 text-fg-muted">{p.employees} covered · ends {day(p.end_date)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
