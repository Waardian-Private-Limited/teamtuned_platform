'use client';

import React from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { useTaxProfile } from '../../hooks/useTaxProfile';
import { PerquisitesSection } from './PerquisitesSection';
import type { PreviousEmployerDto, TaxProofsDto } from '../../types/payroll-setup.dto';
import type { TaxProfile } from '../../types/payroll-setup.model';
import { formatCurrency, formatDate } from '../../utils/validators';

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
const errorInputClass =
  'w-full min-w-0 rounded-lg border border-[var(--tt-danger)] bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-danger)] focus:ring-1 focus:ring-[var(--tt-danger)]';
const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';
const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider text-fg-subtle';
const hintClass = 'mt-1 text-[11px] text-fg-muted';
const errorClass = 'mt-1 text-[11px] font-medium text-[var(--tt-danger)]';

// `regimes` records where a section is claimable. Employer NPS under 80CCD(2) is the
// only one the new regime allows; the rest are old-regime only. The server enforces
// this from tax_regime_config — this list only decides what to render. HRA is no longer
// declared: it is calculated from rent paid (see the house rent section).
const DECLARATION_FIELDS: Array<{ key: string; label: string; hint?: string; regimes: Array<'old' | 'new'> }> = [
  { key: 'section80C', label: 'Section 80C (₹/year)', hint: 'PPF, LIC, tuition fees — capped at ₹1,50,000. Your PF is added automatically.', regimes: ['old'] },
  { key: 'section80CCD1B', label: 'Own NPS — 80CCD(1B) (₹/year)', hint: 'Over and above 80C — capped at ₹50,000', regimes: ['old'] },
  { key: 'section80D', label: 'Section 80D (₹/year)', hint: 'Health insurance premium — capped at ₹1,00,000', regimes: ['old'] },
  { key: 'housingLoanInterest', label: 'Home-loan interest (₹/year)', hint: 'Section 24(b) — capped at ₹2,00,000', regimes: ['old'] },
  { key: 'section80CCD2', label: 'Employer NPS — 80CCD(2) (₹/year)', hint: 'Allowed in both regimes. Capped at 14% of Basic (new) or 10% (old).', regimes: ['old', 'new'] },
  { key: 'other', label: 'Other deductions (₹/year)', hint: 'Any other Chapter VI-A deductions', regimes: ['old'] },
];

// Form 12BB: what HR has checked against proofs. Rent stands in for the HRA claim.
const PROOF_FIELDS: Array<{ key: keyof TaxProofsDto; label: string }> = [
  { key: 'section80C', label: 'Section 80C' },
  { key: 'section80CCD1B', label: 'Own NPS — 80CCD(1B)' },
  { key: 'section80D', label: 'Section 80D' },
  { key: 'housingLoanInterest', label: 'Home-loan interest' },
  { key: 'section80CCD2', label: 'Employer NPS — 80CCD(2)' },
  { key: 'other', label: 'Other deductions' },
  { key: 'rent', label: 'Rent paid' },
];

const PREVIOUS_EMPLOYER_FIELDS: Array<{ key: keyof PreviousEmployerDto; label: string; amount: boolean; placeholder?: string }> = [
  { key: 'income', label: 'Taxable salary (₹)', amount: true },
  { key: 'tds', label: 'TDS deducted (₹)', amount: true },
  { key: 'professionalTax', label: 'Professional tax (₹)', amount: true },
  { key: 'providentFund', label: 'PF (₹)', amount: true },
  { key: 'employerName', label: 'Employer name', amount: false, placeholder: 'e.g., Acme Pvt Ltd' },
  { key: 'employerTan', label: 'Employer TAN', amount: false, placeholder: 'MUMT12345E' },
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
  /** Scroll to the verified-proofs section once loaded (opened from proof review). */
  focusProofs?: boolean;
  onClose: () => void;
}

type Party = { name: string; pan: string };
const EMPTY_PARTY: Party = { name: '', pan: '' };

const amountOrNull = (value: string) => (value.trim() === '' ? null : Number(value));
// Name and PAN of a landlord or lender; both blank clears it on the server.
const partyOrNull = (party: Party) =>
  party.name.trim() || party.pan.trim() ? { name: party.name.trim() || null, pan: party.pan.trim().toUpperCase() || null } : null;
const textOf = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

function proofsOf(form: Record<string, string>): TaxProofsDto {
  const out: TaxProofsDto = {};
  for (const { key } of PROOF_FIELDS) {
    const amount = amountOrNull(form[key] ?? '');
    if (amount !== null && Number.isFinite(amount)) out[key] = amount;
  }
  return out;
}

function sameProofs(a: TaxProofsDto, b: TaxProfile['proofs']): boolean {
  const keys = PROOF_FIELDS.map((f) => f.key);
  return keys.every((k) => (a[k] ?? null) === ((b ?? {})[k] ?? null));
}

export function TaxProfileDialog({ open, employee, financialYear, focusProofs, onClose }: TaxProfileDialogProps) {
  const profile = useTaxProfile(open && employee ? employee.id : null, financialYear);
  const { role, employee_id: myEmployeeId } = useAuth();
  const [regime, setRegime] = React.useState<'old' | 'new'>('new');
  const [pan, setPan] = React.useState('');
  const [declarations, setDeclarations] = React.useState<Record<string, string>>({});
  const [taxOverride, setTaxOverride] = React.useState('');
  const [rentPaid, setRentPaid] = React.useState('');
  const [metroCity, setMetroCity] = React.useState(false);
  const [previous, setPrevious] = React.useState<Record<string, string>>({});
  const [landlord, setLandlord] = React.useState<Party>(EMPTY_PARTY);
  const [lender, setLender] = React.useState<Party>(EMPTY_PARTY);
  const [proofs, setProofs] = React.useState<Record<string, string>>({});
  const [relief89, setRelief89] = React.useState('');
  const proofsRef = React.useRef<HTMLDivElement>(null);

  // Verified proofs are payroll-only. Someone opening their own profile is self-service
  // on the server (orgadmin aside), which refuses proofs, so the section is hidden.
  const isPrivileged = role === 'OrgAdmin' || role === 'superAdmin';
  const isSelf = !isPrivileged && Boolean(employee && myEmployeeId && employee.id === Number(myEmployeeId));
  const canVerifyProofs = !isSelf;

  React.useEffect(() => {
    if (!open) return;
    const p = profile.profile;
    setRegime(p?.regime ?? 'new');
    setPan(p?.pan ?? '');
    const decls: Record<string, string> = {};
    for (const [key, value] of Object.entries(p?.declarations || {})) {
      decls[key] = String(value);
    }
    setDeclarations(decls);
    setTaxOverride(p?.estimatedAnnualTax != null ? String(p.estimatedAnnualTax) : '');
    setRentPaid(textOf(p?.rentPaidAnnual));
    setMetroCity(p?.metroCity ?? false);
    setLandlord(p?.landlord ?? EMPTY_PARTY);
    setLender(p?.homeLoanLender ?? EMPTY_PARTY);
    const prev = p?.previousEmployer;
    setPrevious({
      income: textOf(prev?.income),
      tds: textOf(prev?.tds),
      professionalTax: textOf(prev?.professionalTax),
      providentFund: textOf(prev?.providentFund),
      employerName: prev?.employerName ?? '',
      employerTan: prev?.employerTan ?? '',
    });
    const verified: Record<string, string> = {};
    for (const { key } of PROOF_FIELDS) verified[key] = textOf(p?.proofs?.[key]);
    setProofs(verified);
    setRelief89(textOf(p?.relief89));
  }, [open, profile.profile]);

  React.useEffect(() => {
    if (open && focusProofs && !profile.isLoading) proofsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [open, focusProofs, profile.isLoading]);

  const remainingTax = profile.estimate
    ? Math.max(0, profile.estimate.annualTax - profile.estimate.deductedBeforeCycle)
    : 0;

  const visibleFields = DECLARATION_FIELDS.filter((f) => f.regimes.includes(regime));
  const ignoredHere = profile.estimate?.declarationsIgnored ?? [];
  // An HRA amount typed in before HRA was calculated. Kept on file, shown read-only.
  const legacyHra = profile.profile?.declarations?.hra;
  const errors = profile.fieldErrors;

  const numericDeclarations = () => {
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(declarations)) {
      if (value.trim() !== '' && Number.isFinite(Number(value))) out[key] = Number(value);
    }
    return out;
  };

  const previousEmployer = (): PreviousEmployerDto | null => {
    const out: PreviousEmployerDto = {};
    for (const field of PREVIOUS_EMPLOYER_FIELDS) {
      const raw = (previous[field.key] ?? '').trim();
      if (!raw) continue;
      if (field.key === 'employerName') out.employerName = raw;
      else if (field.key === 'employerTan') out.employerTan = raw.toUpperCase();
      else out[field.key] = Number(raw);
    }
    return Object.keys(out).length ? out : null;
  };

  const submit = () => {
    const verified = proofsOf(proofs);
    return profile.save({
      regime,
      pan: pan.trim(),
      declarations: numericDeclarations(),
      estimated_annual_tax: taxOverride.trim() !== '' ? Number(taxOverride) : null,
      rent_paid_annual: amountOrNull(rentPaid),
      metro_city: metroCity,
      previous_employer: previousEmployer(),
      landlord: partyOrNull(landlord),
      home_loan_lender: partyOrNull(lender),
      // Saving proofs stamps them as verified now, so send them only when they changed.
      proofs: canVerifyProofs && !sameProofs(verified, profile.profile?.proofs ?? null) ? verified : undefined,
      // Payroll only; an employee on their own profile would get 403.
      relief_89: canVerifyProofs ? amountOrNull(relief89) : undefined,
    });
  };

  const titleNode = (
    <div>
      <h2 className="text-sm font-bold text-fg sm:text-base">Tax Profile — {employee?.name}</h2>
      <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
        FY {financialYear} · drives monthly TDS and Form 16
        {profile.profile?.submittedAt && <> · Submitted by employee {formatDate(profile.profile.submittedAt)}</>}
      </p>
    </div>
  );

  const estimate = profile.estimate;

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
                      : errors.regime
                        ? 'border-[var(--tt-danger)] bg-surface hover:bg-bg-subtle'
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
            {errors.regime && <p className={errorClass}>{errors.regime}</p>}
          </div>

          <div>
            <label className={labelClass}>PAN</label>
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
              className={errors.pan ? errorInputClass : inputClass}
            />
            {errors.pan ? (
              <p className={errorClass}>{errors.pan}</p>
            ) : (
              <p className={hintClass}>Without a PAN, TDS is at least 20% of taxable income.</p>
            )}
          </div>

          <div>
            <h3 className={sectionTitle}>Declared deductions (₹/year)</h3>
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
                    className={errors.declarations ? errorInputClass : inputClass}
                  />
                  {field.hint && <p className={hintClass}>{field.hint}</p>}
                </div>
              ))}
            </div>
            {errors.declarations && <p className={errorClass}>{errors.declarations}</p>}
            {regime === 'old' ? (
              <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
                PF (employee share) and professional tax are added automatically under the old regime. Do not include
                them here.
              </p>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
                The new regime allows no 80C, 80D, HRA or home-loan interest deduction. Amounts declared under those
                sections are kept on file and apply automatically if this employee switches to the old regime.
              </p>
            )}
            {regime === 'old' && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PartyInputs
                  label="Home-loan lender"
                  value={lender}
                  onChange={setLender}
                  error={errors.home_loan_lender}
                />
              </div>
            )}
            {errors.home_loan_lender && <p className={errorClass}>{errors.home_loan_lender}</p>}
            {ignoredHere.length > 0 && (
              <p className="mt-2 text-[11px] font-medium text-[var(--tt-danger)]">
                Not claimable under this regime and excluded from the tax below:{' '}
                {ignoredHere.map((key) => fieldLabel(key)).join(', ')}.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Other income (₹/year)</label>
            <input
              type="number"
              min={0}
              value={declarations.otherIncome ?? ''}
              onChange={(e) => setDeclarations((prev) => ({ ...prev, otherIncome: e.target.value }))}
              placeholder="0"
              className={errors.declarations ? errorInputClass : inputClass}
            />
            <p className={hintClass}>Interest or rent from property the employee wants taxed through TDS. Both regimes.</p>
          </div>

          <div>
            <h3 className={sectionTitle}>House rent</h3>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Annual rent paid (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={rentPaid}
                  onChange={(e) => setRentPaid(e.target.value)}
                  placeholder="0"
                  className={errors.rent_paid_annual ? errorInputClass : inputClass}
                />
                {errors.rent_paid_annual && <p className={errorClass}>{errors.rent_paid_annual}</p>}
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 self-end rounded-lg border border-line p-2.5">
                <input type="checkbox" className="mt-0.5" checked={metroCity} onChange={(e) => setMetroCity(e.target.checked)} />
                <span>
                  <span className="block text-xs font-semibold text-fg">Metro city</span>
                  <span className="block text-[11px] text-fg-muted">Delhi, Mumbai, Kolkata, Chennai</span>
                </span>
              </label>
              <PartyInputs label="Landlord" value={landlord} onChange={setLandlord} error={errors.landlord} />
            </div>
            {errors.landlord && <p className={errorClass}>{errors.landlord}</p>}
            <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
              HRA exemption is calculated: the least of HRA received, rent minus 10% of basic, and 50% (metro) / 40% of
              basic. Old regime only.
            </p>
            {legacyHra !== undefined && legacyHra !== null && Number(legacyHra) > 0 && (
              <p className="mt-1 text-[11px] text-fg-muted">
                Earlier HRA declaration on file: <span className="font-semibold text-fg">{formatCurrency(Number(legacyHra))}</span>.
                No longer used — enter the rent instead.
              </p>
            )}
          </div>

          <div>
            <h3 className={sectionTitle}>Previous employer this year (Form 12B)</h3>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PREVIOUS_EMPLOYER_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  <input
                    type={field.amount ? 'number' : 'text'}
                    min={field.amount ? 0 : undefined}
                    maxLength={field.key === 'employerTan' ? 10 : field.key === 'employerName' ? 150 : undefined}
                    value={previous[field.key] ?? ''}
                    onChange={(e) =>
                      setPrevious((prev) => ({
                        ...prev,
                        [field.key]: field.key === 'employerTan' ? e.target.value.toUpperCase() : e.target.value,
                      }))
                    }
                    placeholder={field.placeholder ?? '0'}
                    className={errors.previous_employer ? errorInputClass : inputClass}
                  />
                </div>
              ))}
            </div>
            {errors.previous_employer ? (
              <p className={errorClass}>{errors.previous_employer}</p>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
                Only for someone who joined mid-year. Their earlier salary is taxed with this one, and the TDS already
                deducted counts toward the year.
              </p>
            )}
          </div>

          {canVerifyProofs && (
            <div ref={proofsRef} className="scroll-mt-2 rounded-lg border border-line bg-bg-subtle/60 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className={sectionTitle}>Verified proofs (Form 12BB)</h3>
                <span className="text-[11px] text-fg-muted">
                  {profile.profile?.proofsVerifiedAt
                    ? `Verified ${formatDate(profile.profile.proofsVerifiedAt)}`
                    : 'Not verified yet'}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PROOF_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className={labelClass}>{field.label} (₹/year)</label>
                    <input
                      type="number"
                      min={0}
                      value={proofs[field.key] ?? ''}
                      onChange={(e) => setProofs((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder="Not checked"
                      className={errors.proofs ? errorInputClass : inputClass}
                    />
                  </div>
                ))}
              </div>
              {errors.proofs ? (
                <p className={errorClass}>{errors.proofs}</p>
              ) : (
                <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
                  The amounts HR checked against the employee&apos;s proofs. From the month set in TDS settings, TDS uses
                  these instead of the declarations.
                </p>
              )}
            </div>
          )}

          {canVerifyProofs && <PerquisitesSection employeeId={employee?.id ?? null} financialYear={financialYear} onChanged={profile.refreshEstimate} />}

          {canVerifyProofs && (
            <div>
              <label className={labelClass}>Relief under section 89 (₹)</label>
              <input
                type="number"
                min={0}
                value={relief89}
                onChange={(e) => setRelief89(e.target.value)}
                placeholder="0"
                className={errors.relief_89 ? errorInputClass : inputClass}
              />
              {errors.relief_89 ? (
                <p className={errorClass}>{errors.relief_89}</p>
              ) : (
                <p className={hintClass}>From the employee&apos;s Form 10E.</p>
              )}
            </div>
          )}

          <div>
            <label className={labelClass}>Estimated annual tax override (₹)</label>
            <input
              type="number"
              min={0}
              value={taxOverride}
              onChange={(e) => setTaxOverride(e.target.value)}
              placeholder="Leave empty to auto-compute"
              className={errors.estimated_annual_tax ? errorInputClass : inputClass}
            />
            {errors.estimated_annual_tax ? (
              <p className={errorClass}>{errors.estimated_annual_tax}</p>
            ) : (
              <p className={hintClass}>
                Set only if the payroll/accounts team has already computed the employee&apos;s annual tax externally.
              </p>
            )}
          </div>

          {estimate && (
            <div className="rounded-lg border border-line bg-bg-subtle/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className={sectionTitle}>TDS estimate (from salary structure)</h3>
                <button
                  type="button"
                  onClick={profile.refreshEstimate}
                  className="rounded-md p-1 text-fg-muted transition-colors hover:bg-surface hover:text-fg"
                  title="Refresh estimate"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              {(estimate.noPanRateApplied || estimate.proofMode) && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {estimate.noPanRateApplied && (
                    <span className="rounded-full border border-[var(--tt-danger)] px-2 py-0.5 text-[10px] font-semibold text-[var(--tt-danger)]">
                      TDS at 20% — PAN missing
                    </span>
                  )}
                  {estimate.proofMode && (
                    <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-fg">
                      Using verified proofs
                    </span>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {estimate.oneTimeIncome !== 0 && (
                  <EstimateRow label="One-time payouts" value={estimate.oneTimeIncome} />
                )}
                {estimate.previousEmployerIncome !== 0 && (
                  <EstimateRow label="Previous employer" value={estimate.previousEmployerIncome} />
                )}
                {estimate.perquisites !== 0 && <EstimateRow label="Perquisites" value={estimate.perquisites} />}
                {estimate.otherIncome !== 0 && <EstimateRow label="Other income" value={estimate.otherIncome} />}
                <EstimateRow label="Projected income" value={estimate.projectedAnnualGross} />
                {estimate.exemptAllowances !== 0 && (
                  <EstimateRow label="Exempt allowances" value={-estimate.exemptAllowances} />
                )}
                {estimate.hraExemption !== 0 && <EstimateRow label="HRA exemption" value={-estimate.hraExemption} />}
                <EstimateRow label="Std. deduction" value={-estimate.standardDeduction} />
                <EstimateRow label="Deductions (declared + automatic, within limits)" value={-estimate.declarationTotal} />
                {estimate.regime === 'old' && estimate.autoDeductions.epf !== 0 && <EstimateRow label="Includes PF in 80C" value={estimate.autoDeductions.epf} />}
                {estimate.regime === 'old' && estimate.autoDeductions.professionalTax !== 0 && (
                  <EstimateRow label="Includes professional tax" value={estimate.autoDeductions.professionalTax} />
                )}
                {estimate.autoDeductions.employerNps !== 0 && <EstimateRow label="Includes employer NPS, 80CCD(2)" value={estimate.autoDeductions.employerNps} />}
                <EstimateRow label="Taxable income" value={estimate.taxableIncome} />
                <EstimateRow label="Tax on slabs" value={estimate.slabTax} />
                {estimate.rebate > 0 && (
                  <EstimateRow label="Rebate 87A" value={-estimate.rebate} />
                )}
                {estimate.surcharge > 0 && (
                  <EstimateRow
                    label={`Surcharge ${Math.round(estimate.surchargeRate * 100)}%`}
                    value={estimate.surcharge}
                  />
                )}
                <EstimateRow label="Cess 4%" value={estimate.cess} />
                {estimate.relief89 > 0 && <EstimateRow label="Relief u/s 89" value={-estimate.relief89} />}
                <EstimateRow label="Annual tax" value={estimate.annualTax} />
                {estimate.previousTds !== 0 && (
                  <EstimateRow label="TDS by previous employer" value={estimate.previousTds} />
                )}
                <EstimateRow label="Deducted so far" value={estimate.deductedBeforeCycle} />
                <EstimateRow label="Still to deduct" value={remainingTax} />
                <EstimateRow label="Months left" value={estimate.remainingMonths} raw />
                <EstimateRow label="Monthly TDS" value={estimate.monthlyTds} bold />
              </div>

              {(estimate.rebateRelief > 0 || estimate.surchargeRelief > 0) && (
                <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
                  Marginal relief applied
                  {estimate.rebateRelief > 0
                    ? ` of ${formatCurrency(estimate.rebateRelief)} on the 87A threshold`
                    : ''}
                  {estimate.rebateRelief > 0 && estimate.surchargeRelief > 0 ? ' and' : ''}
                  {estimate.surchargeRelief > 0
                    ? ` of ${formatCurrency(estimate.surchargeRelief)} on the surcharge threshold`
                    : ''}
                  {' '}— tax cannot rise by more than the income earned above the threshold.
                </p>
              )}

              {regime === 'old' && estimate.ageBand !== 'default' && (
                <p className="mt-1 text-[11px] text-fg-muted">
                  Age band: {AGE_BAND_LABEL[estimate.ageBand]} — higher basic exemption applied.
                </p>
              )}

              {estimate.isProvisional && (
                <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">
                  Rates for FY {estimate.financialYear} are marked provisional. Confirm them against the Budget.
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
              <h3 className={sectionTitle}>Old vs new regime</h3>
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

      <ConfirmDialog
        state={
          profile.regimeLock
            ? {
                title: 'Switch tax regime?',
                body: `TDS of ${formatCurrency(profile.regimeLock.deducted)} was already deducted under the current regime this year. Switch anyway? The rest of the year is recalculated.`,
                cta: 'Switch anyway',
                run: async () => {
                  const ok = await profile.confirmRegimeChange();
                  if (ok) profile.refreshEstimate();
                },
              }
            : null
        }
        onClose={profile.dismissRegimeLock}
      />
    </Dialog>
  );
}

function fieldLabel(key: string): string {
  if (key === 'hra') return 'HRA';
  return DECLARATION_FIELDS.find((f) => f.key === key)?.label.replace(/ \(₹\/year\)$/, '') ?? key;
}

function PartyInputs({ label, value, onChange, error }: { label: string; value: Party; onChange: (next: Party) => void; error?: string }) {
  return (
    <>
      <div>
        <label className={labelClass}>{label} name</label>
        <input
          type="text"
          maxLength={150}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className={error ? errorInputClass : inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{label} PAN</label>
        <input
          type="text"
          maxLength={10}
          value={value.pan}
          onChange={(e) => onChange({ ...value, pan: e.target.value.toUpperCase() })}
          placeholder="ABCDE1234F"
          className={error ? errorInputClass : inputClass}
        />
      </div>
    </>
  );
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
