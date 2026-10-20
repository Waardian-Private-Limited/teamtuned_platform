'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { StatusPill } from '@/components/ui/StatusPill';
import { orgToday } from '@/lib/datetime';
import { useTdsAdmin } from '@/features/payroll-setup/hooks/useTdsAdmin';
import { useTdsReadiness } from '@/features/payroll-setup/hooks/useTdsReadiness';
import { useTdsCompanies } from '@/features/payroll-setup/hooks/useTdsCompanies';
import { EMPTY_SETTINGS, fyOptions, QUARTERS, tdsStepStatuses, type StepStatus } from '@/features/payroll-setup/components/tds/tdsShared';
import { useTdsCounters } from '../hooks/useTdsCounters';
import { useTdsPaths } from '../hooks/useTdsPaths';
import { TdsPageShell } from './TdsPageShell';

const STATUS_META: Record<StepStatus, { label: string; tone: 'active' | 'inactive' | 'neutral' }> = {
  done: { label: 'Done', tone: 'active' },
  attention: { label: 'Needs attention', tone: 'inactive' },
  pending: { label: 'Not started', tone: 'neutral' },
};

/** Quarters of the year that have ended, Q1 being April to June. */
function endedQuarters(today: string): number {
  const month = Number(today.slice(5, 7));
  return Math.floor((month >= 4 ? month - 4 : month + 8) / 3);
}

function Counter({ value, label, href }: { value: number | null; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3.5 transition-colors hover:bg-bg-subtle sm:p-4">
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums text-fg">{value ?? '—'}</p>
        <p className="text-xs text-fg-muted">{label}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-fg-muted" />
    </Link>
  );
}

export function TdsOverviewPage() {
  const paths = useTdsPaths();
  const [current, last] = fyOptions();
  const tds = useTdsAdmin();
  const readinessState = useTdsReadiness(current);
  const { companyOptions } = useTdsCompanies();
  const counters = useTdsCounters(current, last, companyOptions);
  const status = tdsStepStatuses(readinessState.readiness, tds.settings ?? EMPTY_SETTINGS);

  const ended = QUARTERS.slice(0, endedQuarters(orgToday()));
  const quartersWithout = tds.challansLoading ? null : ended.filter((q) => !tds.challans.some((c) => c.quarter === q.value)).length;

  const steps: Array<{ title: string; status: StepStatus; href: string }> = [
    { title: 'Employer TAN and signatory', status: status.identity, href: paths.settings },
    { title: `Tax rates for FY ${current}`, status: status.rates, href: paths.settings },
    { title: 'TDS deduction rule', status: status.rule, href: paths.settings },
    { title: 'Employee tax profiles', status: status.profiles, href: paths.declarations },
    { title: 'Quarterly deposits', status: status.challans, href: paths.returns },
    { title: 'Form 16', status: status.form16, href: paths.form16 },
  ];

  return (
    <TdsPageShell title="Income Tax (TDS)" description={`Where TDS stands for FY ${current}, and what to do next.`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Counter value={counters.proofsWaiting} label="Proofs waiting for review" href={paths.proofs} />
        <Counter value={counters.partAMissing} label={`Form 16 Part A missing, FY ${last}`} href={paths.form16} />
        <Counter value={quartersWithout} label="Past quarters with no deposit recorded" href={paths.returns} />
      </div>

      <section className="rounded-xl border border-line bg-surface shadow-xs">
        <h2 className="border-b border-line px-3.5 py-3 text-sm font-bold text-fg sm:px-4">Setup checklist</h2>
        {readinessState.isLoading ? (
          <div className="m-3.5 h-40 animate-pulse rounded-lg bg-bg-subtle" />
        ) : readinessState.error ? (
          <p className="px-3.5 py-3 text-xs font-medium text-[var(--tt-danger)] sm:px-4">{readinessState.error}</p>
        ) : (
          <ul className="divide-y divide-line">
            {steps.map((step, i) => (
              <li key={step.title}>
                <Link href={step.href} className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-bg-subtle sm:px-4">
                  <span
                    className={cx(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                      step.status === 'done' ? 'border-fg bg-fg text-fg-inverted' : 'border-line-strong bg-bg-subtle text-fg-muted'
                    )}
                  >
                    {step.status === 'done' ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{step.title}</span>
                  <StatusPill label={STATUS_META[step.status].label} tone={STATUS_META[step.status].tone} />
                  <ArrowRight className="h-4 w-4 shrink-0 text-fg-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </TdsPageShell>
  );
}
