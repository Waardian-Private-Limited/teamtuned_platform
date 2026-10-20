'use client';

import Link from 'next/link';
import { ArrowRight, Landmark } from 'lucide-react';
import { useMyTaxSummary } from '../hooks/useMyTaxSummary';
import { money } from '../utils/format';

/** One-line income-tax card for My profile; renders nothing when tax doesn't apply. */
export function TaxSummaryCard() {
  const { eligible, summary } = useMyTaxSummary();
  if (!eligible) return null;

  const parts = [
    'Income tax',
    summary ? `${summary.regime === 'old' ? 'Old' : 'New'} regime` : null,
    summary?.monthlyTds !== null && summary?.monthlyTds !== undefined ? `expected ${money(summary.monthlyTds)}/month` : null,
  ].filter(Boolean);

  return (
    <Link
      href="/employee/my-tax"
      className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:bg-bg-subtle sm:p-4 tt-fade-in"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
        <Landmark className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-fg">{parts.join(' · ')}</span>
        <span className="block text-xs text-fg-muted sm:hidden">Declare investments</span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-fg sm:inline-flex">
        Declare investments
        <ArrowRight className="h-4 w-4" />
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-fg sm:hidden" />
    </Link>
  );
}
