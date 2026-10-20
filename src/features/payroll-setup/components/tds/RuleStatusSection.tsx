'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { TdsReadinessDto } from '../../types/payroll-setup.dto';

/** Whether a TDS deduction rule exists, is active and assigned (old TDS step 3). */
export function RuleStatusSection({ readiness, rulesHref }: { readiness: TdsReadinessDto | null; rulesHref: string }) {
  return (
    <div className="space-y-2.5">
      {!readiness?.deductionRule.exists ? (
        <p className="text-xs leading-relaxed text-fg-muted">
          No TDS rule exists yet. Create one in Deduction Rules — choose the <strong>TDS (Income Tax)</strong>
          {' '}category. It needs no amount: the figure is computed per employee from their regime, projected income
          and declarations.
        </p>
      ) : !readiness.deductionRule.active ? (
        <p className="text-xs leading-relaxed text-[var(--tt-danger)]">
          A TDS rule exists but is inactive, so no tax is being deducted. Activate it in Deduction Rules.
        </p>
      ) : readiness.deductionRule.assignedEmployees === 0 ? (
        <p className="text-xs leading-relaxed text-[var(--tt-danger)]">
          <strong>{readiness.deductionRule.ruleName}</strong> is active but assigned to nobody, so no tax is being
          deducted. Assign it to the employees whose salary is taxable.
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-fg-muted">
          <strong>{readiness.deductionRule.ruleName}</strong> is active and assigned to{' '}
          {readiness.deductionRule.assignedEmployees} employee
          {readiness.deductionRule.assignedEmployees === 1 ? '' : 's'}.
        </p>
      )}
      <Link
        href={rulesHref}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
      >
        <span>Go to Deduction Rules</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
