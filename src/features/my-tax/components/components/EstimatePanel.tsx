import type { MyTax } from '../../types/myTax.model';
import { money } from '../../utils/format';

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className={strong ? 'text-sm font-bold tabular-nums text-fg' : 'text-xs font-semibold tabular-nums text-fg'}>{value}</dd>
    </div>
  );
}

/**
 * How the year's tax was worked out, from the last save. There is no live recalculation
 * of unsaved values, so an edited form says so instead of showing stale numbers as new.
 */
export function EstimatePanel({ tax, dirty }: { tax: MyTax; dirty: boolean }) {
  const e = tax.estimate;
  return (
    <aside className="rounded-xl border border-line bg-surface p-4 sm:p-5 lg:sticky lg:top-4">
      <h2 className="text-sm font-bold text-fg sm:text-base">Your estimate</h2>
      {!e ? (
        <p className="mt-1 text-xs text-fg-muted">No estimate to show yet.</p>
      ) : (
        <>
          <p className="mt-0.5 text-xs text-fg-muted">{e.regime === 'old' ? 'Old regime' : 'New regime'}</p>
          <dl className="mt-2 divide-y divide-line">
            {e.salaryAnnual > 0 && <Row label="Salary for the year" value={money(e.salaryAnnual)} />}
            {e.exemptAllowances > 0 && <Row label="Exempt allowances" value={`− ${money(e.exemptAllowances)}`} />}
            {e.oneTimeIncome > 0 && <Row label="Payouts not yet paid" value={money(e.oneTimeIncome)} />}
            {e.previousEmployerIncome > 0 && <Row label="Previous employer" value={money(e.previousEmployerIncome)} />}
            {e.perquisites > 0 && <Row label="Perquisites" value={money(e.perquisites)} />}
            {e.otherIncome > 0 && <Row label="Other income" value={money(e.otherIncome)} />}
            <Row label="Total income" value={money(e.projectedAnnualGross)} />
            <Row label="Standard deduction" value={`− ${money(e.standardDeduction)}`} />
            {e.declarationTotal > 0 && (
              <Row label={e.hraExemption > 0 ? `Deductions, incl. HRA ${money(e.hraExemption)}` : 'Deductions'} value={`− ${money(e.declarationTotal)}`} />
            )}
            <Row label="Taxable income" value={money(e.taxableIncome)} />
            {e.relief89 > 0 && <Row label="Relief under section 89" value={`− ${money(e.relief89)}`} />}
            <Row label="Tax for the year" value={money(e.annualTax)} strong />
            {e.previousTds > 0 && <Row label="TDS by previous employer" value={money(e.previousTds)} />}
            <Row label="Deducted so far" value={money(e.deductedBeforeCycle)} />
            <Row label={`Monthly TDS · ${e.remainingMonths} month${e.remainingMonths === 1 ? '' : 's'} left`} value={money(e.monthlyTds)} strong />
          </dl>
        </>
      )}
      <p className="mt-3 border-t border-line pt-3 text-xs text-fg-muted">
        {dirty ? 'You have unsaved changes. Save to update the estimate.' : 'Based on what you last saved.'}
      </p>
    </aside>
  );
}
