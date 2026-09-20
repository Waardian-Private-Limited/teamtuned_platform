'use client';

import React from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { useTaxProfile } from '../../hooks/useTaxProfile';
import { formatCurrency } from '../../utils/validators';

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';

// `regimes` records where a section is claimable. Employer NPS under 80CCD(2) is the
// only one the new regime allows; the rest are old-regime only. The server enforces
// this from tax_regime_config — this list only decides what to render.
const DECLARATION_FIELDS: Array<{ key: string; label: string; hint?: string; regimes: Array<'old' | 'new'> }> = [
  { key: 'section80C', label: 'Section 80C (₹/year)', hint: 'EPF, PPF, LIC, tuition fees — capped at ₹1,50,000', regimes: ['old'] },
  { key: 'section80D', label: 'Section 80D (₹/year)', hint: 'Health insurance premium — capped at ₹1,00,000', regimes: ['old'] },
  { key: 'hra', label: 'HRA exempt (₹/year)', hint: 'Rent allowance exemption', regimes: ['old'] },
  { key: 'housingLoanInterest', label: 'Home-loan interest (₹/year)', hint: 'Section 24(b) — capped at ₹2,00,000', regimes: ['old'] },
  { key: 'section80CCD2', label: 'Employer NPS — 80CCD(2) (₹/year)', hint: 'Allowed in both regimes. Capped at 14% of Basic (new) or 10% (old).', regimes: ['old', 'new'] },
  { key: 'other', label: 'Other deductions (₹/year)', hint: 'Any other Chapter VI-A deductions', regimes: ['old'] },
];

const AGE_BAND_LABEL: Record<string, string> = {
  default: 'Below 60',
  senior: 'Senior citizen (60-79)',
  super_senior: 'Super senior (80+)',
};

interface TaxProfileDialogProps {
  open: boolean;
  employee: { id: number; name: string } | null;
  financialYear: string;
  onClose: () => void;
}

export function TaxProfileDialog({ open, employee, financialYear, onClose }: TaxProfileDialogProps) {
  const profile = useTaxProfile(open && employee ? employee.id : null, financialYear);
  const [regime, setRegime] = React.useState<'old' | 'new'>('new');
  const [pan, setPan] = React.useState('');
  const [declarations, setDeclarations] = React.useState<Record<string, string>>({});
  const [taxOverride, setTaxOverride] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setRegime(profile.profile?.regime ?? 'new');
    setPan(profile.profile?.pan ?? '');
    const decls: Record<string, string> = {};
    for (const [key, value] of Object.entries(profile.profile?.declarations || {})) {
      decls[key] = String(value);
    }
    setDeclarations(decls);
    setTaxOverride(profile.profile?.estimatedAnnualTax != null ? String(profile.profile.estimatedAnnualTax) : '');
  }, [open, profile.profile]);

  const remainingTax = profile.estimate
    ? Math.max(0, profile.estimate.annualTax - profile.estimate.deductedBeforeCycle)
    : 0;

  const visibleFields = DECLARATION_FIELDS.filter((f) => f.regimes.includes(regime));
  const ignoredHere = profile.estimate?.declarationsIgnored ?? [];

  const numericDeclarations = () => {
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(declarations)) {
      if (value.trim() !== '' && Number.isFinite(Number(value))) out[key] = Number(value);
    }
    return out;
  };

  const submit = () =>
    profile.save({
      regime,
      pan: pan.trim(),
      declarations: numericDeclarations(),
      estimated_annual_tax: taxOverride.trim() !== '' ? Number(taxOverride) : null,
    });

  const titleNode = (
    <div>
      <h2 className="text-sm font-bold text-fg sm:text-base">Tax Profile — {employee?.name}</h2>
      <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
        FY {financialYear} · drives monthly TDS and Form 16
      </p>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleNode}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={profile.isSaving || !profile.isYearConfigured}
            title={profile.isYearConfigured ? undefined : `No tax rates configured for FY ${financialYear}`}
            onClick={async () => {
              const ok = await submit();
              if (ok) profile.refreshEstimate();
            }}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {profile.isSaving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Check className="h-3.5 w-3.5" />}
            <span>Save Profile</span>
          </button>
        </>
      }
    >
      {profile.isLoading ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-bg-subtle" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {profile.error && <Alert message={profile.error} tone="error" />}

          {!profile.isYearConfigured && (
            <div className="rounded-lg border border-[var(--tt-danger)] bg-surface p-3">
              <p className="text-xs font-semibold text-fg">
                No income-tax rates configured for FY {financialYear}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                TDS cannot be calculated for this year until the slab rates, rebate and surcharge bands are added.
                Payroll runs that include a TDS rule will fail for this financial year until then.
                {profile.configuredYears && profile.configuredYears.length > 0 && (
                  <> Rates are currently configured for {profile.configuredYears.join(', ')}.</>
                )}
              </p>
            </div>
          )}

          <div>
            <label className={labelClass}>Tax Regime</label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['new', 'old'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegime(r)}
                  className={cx(
                    'rounded-lg border p-2.5 text-left transition-all',
                    regime === r
                      ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                      : 'border-line bg-surface hover:bg-bg-subtle'
                  )}
                >
                  <div className="text-xs font-semibold text-fg">{r === 'new' ? 'New Regime' : 'Old Regime'}</div>
                  <div className="text-[11px] text-fg-muted">
                    {r === 'new' ? 'Lower slabs, ₹75k standard deduction' : 'Old slabs + 80C/80D/HRA deductions'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>PAN</label>
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
              className={inputClass}
            />
            {profile.fieldErrors.pan && <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{profile.fieldErrors.pan}</p>}
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Declared deductions (₹/year)</h3>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visibleFields.map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  <input
                    type="number"
                    min={0}
                    value={declarations[field.key] ?? ''}
                    onChange={(e) => setDeclarations((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder="0"
                    className={inputClass}
                  />
                  {field.hint && <p className="mt-1 text-[11px] text-fg-muted">{field.hint}</p>}
                </div>
              ))}
            </div>
            {regime === 'new' && (
              <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
                The new regime allows no 80C, 80D, HRA or home-loan interest deduction. Amounts declared under those
                sections are kept on file and apply automatically if this employee switches to the old regime.
              </p>
            )}
            {ignoredHere.length > 0 && (
              <p className="mt-2 text-[11px] font-medium text-[var(--tt-danger)]">
                Not claimable under this regime and excluded from the tax below:{' '}
                {ignoredHere.map((key) => fieldLabel(key)).join(', ')}.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Estimated annual tax override (₹)</label>
            <input
              type="number"
              min={0}
              value={taxOverride}
              onChange={(e) => setTaxOverride(e.target.value)}
              placeholder="Leave empty to auto-compute"
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-fg-muted">
              Set only if the payroll/accounts team has already computed the employee&apos;s annual tax externally.
            </p>
          </div>

          {profile.estimate && (
            <div className="rounded-lg border border-line bg-bg-subtle/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">TDS estimate (from salary structure)</h3>
                <button
                  type="button"
                  onClick={profile.refreshEstimate}
                  className="rounded-md p-1 text-fg-muted transition-colors hover:bg-surface hover:text-fg"
                  title="Refresh estimate"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <EstimateRow label="Projected income" value={profile.estimate.projectedAnnualGross} />
                <EstimateRow label="Std. deduction" value={-profile.estimate.standardDeduction} />
                <EstimateRow label="Declarations" value={-profile.estimate.declarationTotal} />
                <EstimateRow label="Taxable income" value={profile.estimate.taxableIncome} />
                <EstimateRow label="Tax on slabs" value={profile.estimate.slabTax} />
                {profile.estimate.rebate > 0 && (
                  <EstimateRow label="Rebate 87A" value={-profile.estimate.rebate} />
                )}
                {profile.estimate.surcharge > 0 && (
                  <EstimateRow
                    label={`Surcharge ${Math.round(profile.estimate.surchargeRate * 100)}%`}
                    value={profile.estimate.surcharge}
                  />
                )}
                <EstimateRow label="Cess 4%" value={profile.estimate.cess} />
                <EstimateRow label="Annual tax" value={profile.estimate.annualTax} />
                <EstimateRow label="Deducted so far" value={profile.estimate.deductedBeforeCycle} />
                <EstimateRow label="Still to deduct" value={remainingTax} />
                <EstimateRow label="Months left" value={profile.estimate.remainingMonths} raw />
                <EstimateRow label="Monthly TDS" value={profile.estimate.monthlyTds} bold />
              </div>

              {(profile.estimate.rebateRelief > 0 || profile.estimate.surchargeRelief > 0) && (
                <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
                  Marginal relief applied
                  {profile.estimate.rebateRelief > 0
                    ? ` of ${formatCurrency(profile.estimate.rebateRelief)} on the 87A threshold`
                    : ''}
                  {profile.estimate.rebateRelief > 0 && profile.estimate.surchargeRelief > 0 ? ' and' : ''}
                  {profile.estimate.surchargeRelief > 0
                    ? ` of ${formatCurrency(profile.estimate.surchargeRelief)} on the surcharge threshold`
                    : ''}
                  {' '}— tax cannot rise by more than the income earned above the threshold.
                </p>
              )}

              {regime === 'old' && profile.estimate.ageBand !== 'default' && (
                <p className="mt-1 text-[11px] text-fg-muted">
                  Age band: {AGE_BAND_LABEL[profile.estimate.ageBand]} — higher basic exemption applied.
                </p>
              )}

              {profile.estimate.isProvisional && (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">
                  Rates for FY {profile.estimate.financialYear} are marked provisional. Confirm them against the Budget.
                </p>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
                Each payslip deducts the tax still outstanding spread over the months left in the year. Change the
                regime or a declaration and the next payslip absorbs the difference — payslips already generated are
                not rewritten.
              </p>
            </div>
          )}
          <div className="rounded-lg border border-line bg-bg-subtle/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Old vs new regime</h3>
              <button
                type="button"
                onClick={() => profile.compareRegimes(numericDeclarations())}
                disabled={profile.isComparing || !profile.isYearConfigured}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-[11px] font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-50"
              >
                {profile.isComparing && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                <span>{profile.comparison ? 'Recompare' : 'Compare'}</span>
              </button>
            </div>

            {!profile.comparison ? (
              <p className="text-[11px] leading-relaxed text-fg-muted">
                Runs the same declarations through both regimes and shows which costs less this year.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {(['old', 'new'] as const).map((key) => {
                    const side = profile.comparison?.[key];
                    const isCheaper = profile.comparison?.cheaper === key;
                    return (
                      <div
                        key={key}
                        className={cx(
                          'rounded-lg border p-2.5',
                          isCheaper ? 'border-[var(--tt-primary)] bg-surface ring-1 ring-[var(--tt-primary)]' : 'border-line bg-surface'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-semibold text-fg">
                            {key === 'old' ? 'Old regime' : 'New regime'}
                          </span>
                          {isCheaper && (
                            <span className="rounded-full bg-[var(--tt-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--tt-primary)]">
                              Lower
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm font-semibold tabular-nums text-fg">
                          {side ? formatCurrency(side.annualTax) : '—'}
                        </div>
                        <div className="text-[10px] text-fg-subtle">
                          {side ? `Taxable ${formatCurrency(side.taxableIncome)}` : 'Rates not configured'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
                  {profile.comparison.cheaper === 'equal'
                    ? 'Both regimes cost the same this year.'
                    : profile.comparison.cheaper
                      ? `The ${profile.comparison.cheaper} regime saves ${formatCurrency(profile.comparison.saving)} this year. Switching is the employee's choice — this does not change their regime.`
                      : 'Comparison unavailable: one of the regimes has no rates configured for this year.'}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

function fieldLabel(key: string): string {
  return DECLARATION_FIELDS.find((f) => f.key === key)?.label.replace(/ \(₹\/year\)$/, '') ?? key;
}

function EstimateRow({ label, value, bold, raw }: { label: string; value: number; bold?: boolean; raw?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className={cx('text-xs tabular-nums text-fg', bold && 'font-semibold')}>
        {raw ? value : formatCurrency(value)}
      </div>
    </div>
  );
}
