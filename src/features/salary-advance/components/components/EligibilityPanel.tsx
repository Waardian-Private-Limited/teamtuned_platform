'use client';

import { CheckCircle2, CircleSlash } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { INTEREST_LABEL } from '../../constants/salaryAdvance.constants';
import type { Eligibility } from '../../types/salaryAdvance.model';
import { money } from '../../utils/format';
import { Block } from './StatusBadges';

export function interestText(e: Pick<Eligibility, 'interestMode' | 'interestRate'>) {
  return e.interestMode === 'none' || !e.interestRate ? 'No interest' : `${INTEREST_LABEL[e.interestMode]} · ${e.interestRate}% a year`;
}

export function EligibilityPanel({ eligibility, loading, error, audience }: { eligibility: Eligibility | null; loading: boolean; error?: string; audience: 'hr' | 'employee' }) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border border-line bg-bg-subtle/60 p-3.5">
        <Block className="h-4 w-1/3" />
        <Block className="h-6 w-1/2" />
        <Block className="h-3 w-2/3" />
      </div>
    );
  }
  if (error) return <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>;
  if (!eligibility) return null;
  const e = eligibility;
  const showLimits = audience === 'hr' || !e.hideLimits;

  return (
    <div className={cx('rounded-xl border p-3.5 transition-colors', e.eligible ? 'border-line bg-bg-subtle/60' : 'border-[var(--tt-danger)]/30 bg-surface')}>
      <div className="flex items-center gap-2">
        {e.eligible ? <CheckCircle2 className="h-4 w-4 text-fg" /> : <CircleSlash className="h-4 w-4 text-[var(--tt-danger)]" />}
        <span className={cx('text-xs font-semibold sm:text-sm', e.eligible ? 'text-fg' : 'text-[var(--tt-danger)]')}>
          {e.eligible ? (audience === 'hr' ? 'Eligible' : 'You can request this') : audience === 'hr' ? 'Not eligible right now' : 'Not available right now'}
        </span>
      </div>
      {e.eligible && showLimits && e.maxAmount !== null && (
        <div className="mt-2.5 flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <p className="text-[11px] text-fg-muted">Up to</p>
            <p className="text-xl font-extrabold tabular-nums text-fg">{money(e.maxAmount)}</p>
          </div>
          {e.earnedSoFar !== null && (
            <div>
              <p className="text-[11px] text-fg-muted">Earned so far this cycle</p>
              <p className="text-sm font-semibold tabular-nums text-fg">{money(e.earnedSoFar)}</p>
            </div>
          )}
          {!!e.outstanding && (
            <div>
              <p className="text-[11px] text-fg-muted">Already owed</p>
              <p className="text-sm font-semibold tabular-nums text-fg">{money(e.outstanding)}</p>
            </div>
          )}
        </div>
      )}
      {e.eligible && (
        <p className="mt-2 text-[11px] text-fg-muted sm:text-xs">
          In one go or instalments · {interestText(e)} · {e.disbursementMode === 'payroll' ? 'paid with payroll' : 'paid by Accounts'}
        </p>
      )}
      {!e.eligible && e.reasons.length > 0 && (
        <ul className="mt-2 space-y-1">
          {e.reasons.map((r) => (
            <li key={r} className="text-xs text-fg-muted">{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
