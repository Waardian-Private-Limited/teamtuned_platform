'use client';

import React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useTdsReadiness } from '@/features/payroll-setup/hooks/useTdsReadiness';
import { TaxProfileDialog } from '@/features/payroll-setup/components/components/TaxProfileDialog';
import { fyOptions } from '@/features/payroll-setup/components/tds/tdsShared';
import { useTdsEmployees } from '../hooks/useTdsEmployees';
import { useTdsPaths } from '../hooks/useTdsPaths';
import { FySelect, TdsPageShell } from './TdsPageShell';

export function TdsDeclarationsPage() {
  const paths = useTdsPaths();
  const [fy, setFy] = React.useState(fyOptions()[0]);
  const readinessState = useTdsReadiness(fy);
  const readiness = readinessState.readiness;
  const list = useTdsEmployees(readiness?.deductionRule.ruleId ?? null);
  const [open, setOpen] = React.useState<{ id: number; name: string } | null>(null);
  const profiles = readiness?.taxProfiles;

  return (
    <TdsPageShell
      title="Employee declarations"
      description="Each employee's regime, investments, verified proofs, perquisites and relief."
      actions={<FySelect value={fy} options={fyOptions()} onChange={setFy} />}
    >
      <section className="rounded-xl border border-line bg-surface shadow-xs">
        <div className="flex flex-col gap-2 border-b border-line p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <p className="text-xs text-fg-muted">
            {profiles
              ? <><span className="font-semibold text-fg">{profiles.withProfile}</span> of {profiles.assigned} have a profile for FY {fy}.
                {profiles.missing > 0 && <span className="font-semibold text-[var(--tt-danger)]"> {profiles.missing} still missing.</span>}</>
              : 'Employees assigned the TDS rule.'}
          </p>
          <label className="relative block w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
            <input
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Search by name"
              aria-label="Search employees"
              className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]"
            />
          </label>
        </div>

        {readinessState.isLoading || list.isLoading ? (
          <div className="m-3.5 h-32 animate-pulse rounded-lg bg-bg-subtle" />
        ) : readinessState.error || list.error ? (
          <p className="p-4 text-xs font-medium text-[var(--tt-danger)]">{readinessState.error || list.error}</p>
        ) : !readiness?.deductionRule.ruleId ? (
          <p className="p-4 text-xs text-fg-muted">
            No TDS rule yet, so no one declares.{' '}
            <Link href={paths.settings} className="font-semibold text-fg underline underline-offset-4">Set it up in TDS settings</Link>
          </p>
        ) : list.employees.length === 0 ? (
          <p className="p-4 text-xs text-fg-muted">{list.total === 0 ? 'The TDS rule is assigned to nobody yet.' : 'No one matches that search.'}</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.employees.map((e) => (
              <li key={e.employeeId}>
                <button
                  type="button"
                  onClick={() => setOpen({ id: e.employeeId, name: e.name })}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-bg-subtle sm:px-4"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-fg">{e.name}</span>
                    <span className="block truncate text-xs text-fg-muted">{[e.designation, e.email].filter(Boolean).join(' · ') || '—'}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-fg">Tax profile</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TaxProfileDialog
        open={open !== null}
        employee={open}
        financialYear={fy}
        onClose={() => {
          setOpen(null);
          readinessState.reload();
        }}
      />
    </TdsPageShell>
  );
}
