'use client';

import { useContext, useMemo } from 'react';
import { BriefcaseBusiness, Check, Coins, Gift, Home, IdCard, PiggyBank } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { TaxProofs, TaxProofSection } from '@/features/payroll-setup/types/payroll-setup.model';
import { DEDUCTION_FIELDS, LANDLORD_PAN_ABOVE, PREVIOUS_FIELDS } from '../constants/myTax.constants';
import { useMyProofs, type MyProofs } from '../hooks/useMyProofs';
import { useMyTax } from '../hooks/useMyTax';
import { toTaxForm } from '../types/myTax.mapper';
import type { AmountKey, MyTax, PreviousKey, TaxFieldName, TaxForm } from '../types/myTax.model';
import { money, windowLine } from '../utils/format';
import { EstimatePanel } from './components/EstimatePanel';
import { Form16Section } from './components/Form16Section';
import { REGIME_ANCHOR, RegimeChooser } from './components/RegimeChooser';
import { ProofFiles } from './components/ProofFiles';
import { AmountField, errorClass, hintClass, ReadOnlyContext, TextField } from './components/TaxFields';
import { TaxHeader } from './components/TaxHeader';
import { TaxSection } from './components/TaxSection';
import { TaxSkeleton } from './components/TaxSkeleton';

type Patch = (changes: Partial<TaxForm>, field?: TaxFieldName) => void;
type Errors = Partial<Record<TaxFieldName, string>>;
type SectionProps = { tax: MyTax; form: TaxForm; patch: Patch; errors: Errors; proofs: MyProofs; canUpload: boolean };

function verifiedOf(tax: MyTax, key: keyof TaxProofs): number | undefined {
  return tax.profile?.proofs?.[key];
}

function PreviousEmployerSection({ form, patch, errors, open, proofs, canUpload }: SectionProps & { open: boolean }) {
  const setPrevious = (key: PreviousKey, value: string) => patch({ previous: { ...form.previous, [key]: value } }, 'previous_employer');
  return (
    <TaxSection
      title="Previous employer this year (Form 12B)"
      icon={BriefcaseBusiness}
      description="Salary and tax from a job you left since 1 April. It is added to this year's income."
      prompt="Worked elsewhere since 1 April?"
      defaultOpen={open}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PREVIOUS_FIELDS.map((f) =>
          f.amount ? (
            <AmountField
              key={f.key}
              label={f.label}
              value={form.previous[f.key]}
              onChange={(v) => setPrevious(f.key, v)}
              invalid={Boolean(errors.previous_employer)}
            />
          ) : (
            <TextField
              key={f.key}
              label={f.label}
              value={form.previous[f.key]}
              onChange={(v) => setPrevious(f.key, v)}
              placeholder={f.placeholder}
              maxLength={f.key === 'employerTan' ? 10 : 150}
              upper={f.key === 'employerTan'}
              invalid={Boolean(errors.previous_employer)}
            />
          )
        )}
      </div>
      {errors.previous_employer ? (
        <p className={errorClass}>{errors.previous_employer}</p>
      ) : (
        <p className={hintClass}>Copy these from the Form 16 or final payslip your last employer gave you.</p>
      )}
      <ProofFiles section="previousEmployer" proofs={proofs} canUpload={canUpload} />
    </TaxSection>
  );
}

function HouseRentSection({ tax, form, patch, errors, proofs, canUpload }: SectionProps) {
  const readOnly = useContext(ReadOnlyContext);
  const panNeeded = Number(form.rent) > LANDLORD_PAN_ABOVE;
  return (
    <TaxSection title="House rent" icon={Home} description="Your HRA exemption is worked out from the rent you pay.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AmountField
          label="Rent paid this year"
          value={form.rent}
          onChange={(v) => patch({ rent: v }, 'rent')}
          error={errors.rent}
          verified={verifiedOf(tax, 'rent')}
        >
          <ProofFiles section="rent" proofs={proofs} canUpload={canUpload} />
        </AmountField>
        <label className="flex cursor-pointer items-start gap-2.5 self-start rounded-lg border border-line p-3 sm:mt-[26px]">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[var(--tt-primary)]"
            checked={form.metroCity}
            disabled={readOnly}
            onChange={(e) => patch({ metroCity: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-semibold text-fg">I live in a metro city</span>
            <span className="block text-xs text-fg-muted">Delhi, Mumbai, Kolkata, Chennai</span>
          </span>
        </label>
        <TextField
          label="Landlord name"
          value={form.landlordName}
          onChange={(v) => patch({ landlordName: v }, 'landlord')}
          maxLength={150}
        />
        <TextField
          label={panNeeded ? 'Landlord PAN (required)' : 'Landlord PAN'}
          value={form.landlordPan}
          onChange={(v) => patch({ landlordPan: v }, 'landlord')}
          placeholder="ABCDE1234F"
          maxLength={10}
          upper
          error={errors.landlord}
          hint={`Needed when rent is above ${money(LANDLORD_PAN_ABOVE)} a year.`}
        />
      </div>
    </TaxSection>
  );
}

function DeductionsSection({ tax, form, patch, errors, proofs, canUpload }: SectionProps) {
  const pf = tax.estimate?.autoDeductions.epf ?? 0;
  const setAmount = (key: AmountKey, value: string) => patch({ amounts: { ...form.amounts, [key]: value } }, key);
  return (
    <TaxSection title="Investments and deductions" icon={PiggyBank} description="Amounts for the whole year, 1 April to 31 March.">
      <div className="flex flex-col gap-4">
        {DEDUCTION_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-3">
            <AmountField
              label={f.title}
              value={form.amounts[f.key]}
              onChange={(v) => setAmount(f.key, v)}
              error={errors[f.key]}
              invalid={Boolean(errors.declarations)}
              verified={verifiedOf(tax, f.key as keyof TaxProofs)}
              hint={f.key === 'section80C' && pf > 0 ? `${f.hint} Your PF this year: ${money(pf)}.` : f.hint}
            >
              <ProofFiles section={f.key as TaxProofSection} proofs={proofs} canUpload={canUpload} />
            </AmountField>
            {f.lender && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="Lender name"
                  value={form.lenderName}
                  onChange={(v) => patch({ lenderName: v }, 'home_loan_lender')}
                  placeholder="e.g., State Bank of India"
                  maxLength={150}
                />
                <TextField
                  label="Lender PAN"
                  value={form.lenderPan}
                  onChange={(v) => patch({ lenderPan: v }, 'home_loan_lender')}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  upper
                  error={errors.home_loan_lender}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {errors.declarations && <p className={errorClass}>{errors.declarations}</p>}
    </TaxSection>
  );
}

function NewRegimeNote({ employerNps }: { employerNps: number }) {
  return (
    <div className="rounded-xl border border-line bg-bg-subtle p-4 text-sm text-fg">
      <p>
        Most deductions don&apos;t apply in the new regime.{' '}
        <button
          type="button"
          onClick={() => document.getElementById(REGIME_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="font-semibold underline underline-offset-4"
        >
          Compare regimes
        </button>
      </p>
      {employerNps > 0 && (
        <p className="mt-1 text-xs text-fg-muted">Employer NPS of {money(employerNps)} is counted automatically.</p>
      )}
    </div>
  );
}

function PerquisitesSection({ tax }: { tax: MyTax }) {
  return (
    <TaxSection title="Perquisites from your employer" icon={Gift} description="These are taxed as salary.">
      <ul className="divide-y divide-line">
        {tax.perquisites.map((p, i) => (
          <li key={`${p.label}-${i}`} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">{p.label}</p>
              {p.description && <p className="text-xs text-fg-muted">{p.description}</p>}
            </div>
            <p className="shrink-0 text-sm font-bold tabular-nums text-fg">{money(p.taxable)}</p>
          </li>
        ))}
      </ul>
    </TaxSection>
  );
}

function DeclarationForm({ hook }: { hook: ReturnType<typeof useMyTax> }) {
  const { form, patch, fieldErrors: errors } = hook;
  const tax = hook.data!;
  const proofs = useMyProofs(tax.financialYear);
  const old = form.regime === 'old';
  const prev = tax.profile?.previousEmployer;
  const hasPrevious = Boolean(prev && (prev.income || prev.tds || prev.employerName));
  // Outside the declaration window everything stays visible but can't change.
  const readOnly = !tax.windows.declaration.open;
  const canUpload = tax.windows.proof.open;
  const section = { tax, form, patch, errors, proofs, canUpload };
  const notices = [
    !tax.tdsAssigned && 'Payroll has not started deducting TDS for you yet. Your choices are saved and used once it starts.',
    readOnly && `${windowLine('Declarations', tax.windows.declaration)}. You can still see everything below.`,
    !canUpload && windowLine('Proof upload', tax.windows.proof),
  ].filter(Boolean) as string[];

  return (
    <ReadOnlyContext.Provider value={readOnly}>
    <form
      noValidate
      className="flex min-w-0 flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await hook.save();
        // On a phone the first problem may be off screen; take the person to it.
        if (!ok) requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      }}
    >
      {notices.length > 0 && (
        <div className="rounded-xl border border-line bg-bg-subtle p-4 text-sm text-fg">
          {notices.map((line) => <p key={line}>{line}</p>)}
        </div>
      )}

      <RegimeChooser
        value={form.regime}
        onChange={(regime) => patch({ regime }, 'regime')}
        comparison={tax.comparison}
        locked={tax.regimeLocked}
        disabled={readOnly}
        error={errors.regime}
      />

      <TaxSection title="PAN" icon={IdCard}>
        <TextField
          label="Your PAN"
          value={form.pan}
          onChange={(v) => patch({ pan: v }, 'pan')}
          placeholder="ABCDE1234F"
          maxLength={10}
          upper
          error={errors.pan}
          hint="Without a PAN, TDS is at least 20%."
        />
      </TaxSection>

      <PreviousEmployerSection {...section} open={tax.joinedThisYear || hasPrevious} />

      {old ? (
        <>
          <HouseRentSection {...section} />
          <DeductionsSection {...section} />
        </>
      ) : (
        <NewRegimeNote employerNps={tax.estimate?.autoDeductions.employerNps ?? 0} />
      )}

      <TaxSection title="Other income to include in TDS" icon={Coins} description="Bank interest, rent from a property you let out.">
        <AmountField
          label="Other income this year"
          value={form.amounts.otherIncome}
          onChange={(v) => patch({ amounts: { ...form.amounts, otherIncome: v } }, 'otherIncome')}
          error={errors.otherIncome}
          hint="Optional. Adding it now avoids paying tax later."
        />
        {!old && errors.declarations && <p className={errorClass}>{errors.declarations}</p>}
      </TaxSection>

      {tax.perquisites.length > 0 && <PerquisitesSection tax={tax} />}

      {!readOnly && (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={hook.saving}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--tt-primary)] px-5 text-sm font-semibold text-[var(--tt-on-primary)] transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {hook.saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          <span>{hook.saving ? 'Saving…' : 'Submit declaration'}</span>
        </button>
        {hook.saved && (
          <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-fg">
            <Check className="h-4 w-4 shrink-0" />
            Saved. Your TDS from the next payroll uses this.
          </p>
        )}
      </div>
      )}
      {hook.formError && <p role="alert" className="text-sm text-[var(--tt-danger)]">{hook.formError}</p>}
    </form>
    </ReadOnlyContext.Provider>
  );
}

export function MyTaxPage() {
  const hook = useMyTax();
  const { data, loading, error, retry } = hook;
  const savedForm = useMemo(() => toTaxForm(data?.profile ?? null), [data?.profile]);
  const dirty = JSON.stringify(savedForm) !== JSON.stringify(hook.form);

  const form16 = data && (
    <Form16Section
      entries={data.form16}
      downloading={hook.downloading}
      error={hook.downloadError}
      onDownload={hook.downloadForm16}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 pb-8">
      {loading && !data ? (
        <TaxSkeleton />
      ) : error && !data ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState
            illustration={{ src: '/vectors/debits.svg', width: 220, height: 160, alt: 'Income tax unavailable' }}
            title="Couldn't load your tax details"
            description={error}
            action={{ label: 'Try again', onClick: retry }}
          />
        </div>
      ) : data && !data.eligible ? (
        <div className="flex flex-col gap-4 tt-fade-in">
          <div className="rounded-xl border border-line bg-surface">
            <EmptyState
              illustration={{ src: '/vectors/debits.svg', width: 220, height: 160, alt: 'No income tax' }}
              title="Income tax is not deducted from your salary"
              description="If you think it should be, ask payroll."
            />
          </div>
          {data.form16.length > 0 && form16}
        </div>
      ) : data ? (
        <div className="flex flex-col gap-4 tt-fade-in">
          <TaxHeader tax={data} />
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <DeclarationForm hook={hook} />
            <EstimatePanel tax={data} dirty={dirty} />
          </div>
          {form16}
        </div>
      ) : null}
    </div>
  );
}
