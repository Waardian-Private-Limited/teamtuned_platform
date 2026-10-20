import { toTaxParty, toTdsEstimate } from '@/features/payroll-setup/types/payroll-setup.mapper';
import type { TaxPartyDto } from '@/features/payroll-setup/types/payroll-setup.dto';
import type { MyForm16Dto, MyTaxDeclarationsDto, MyTaxDto, MyTaxProfileDto, SaveMyTaxBodyDto, TaxWindowDto } from './myTax.dto';
import type { AmountKey, Form16Entry, MyTax, MyTaxProfile, TaxForm, TaxWindow } from './myTax.model';

const AMOUNT_KEYS: AmountKey[] = ['section80C', 'section80CCD1B', 'section80D', 'housingLoanInterest', 'other', 'otherIncome'];

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

const textOf = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

function toForm16(dto: MyForm16Dto): Form16Entry {
  const company = dto.sub_organization_id ?? null;
  return {
    key: `${dto.financial_year}:${company ?? 'org'}`,
    financialYear: dto.financial_year,
    company,
    companyName: dto.company_name || 'Your employer',
    releasedAt: dto.released_at,
  };
}

export function toMyTaxProfile(dto: MyTaxProfileDto): MyTaxProfile {
  const declarations: MyTaxProfile['declarations'] = {};
  for (const [key, value] of Object.entries(dto.declarations || {})) {
    const amount = toNumber(value);
    if (amount !== null) declarations[key as keyof MyTaxProfile['declarations']] = amount;
  }
  const prev = dto.previous_employer;
  const proofs: NonNullable<MyTaxProfile['proofs']> = {};
  for (const [key, value] of Object.entries(dto.proofs || {})) {
    const amount = toNumber(value);
    if (amount !== null) proofs[key as keyof typeof proofs] = amount;
  }
  return {
    regime: dto.regime === 'old' ? 'old' : 'new',
    pan: dto.pan ?? '',
    declarations,
    rentPaidAnnual: toNumber(dto.rent_paid_annual),
    metroCity: Boolean(dto.metro_city),
    landlord: toTaxParty(dto.landlord),
    homeLoanLender: toTaxParty(dto.home_loan_lender),
    previousEmployer: prev
      ? {
          income: toNumber(prev.income),
          tds: toNumber(prev.tds),
          professionalTax: toNumber(prev.professionalTax),
          providentFund: toNumber(prev.providentFund),
          employerName: prev.employerName ?? '',
          employerTan: prev.employerTan ?? '',
        }
      : null,
    proofs: dto.proofs ? proofs : null,
    proofsVerifiedAt: dto.proofs_verified_at ?? null,
    submittedAt: dto.submitted_at ?? null,
  };
}

function toWindow(dto: TaxWindowDto | undefined): TaxWindow {
  return { open: dto ? Boolean(dto.open) : true, opensOn: dto?.opens_on ?? null, closesOn: dto?.closes_on ?? null };
}

export function toMyTax(dto: MyTaxDto): MyTax {
  const c = dto.comparison;
  return {
    eligible: Boolean(dto.eligible),
    financialYear: dto.financial_year,
    form16: (dto.form16 || []).map(toForm16),
    profile: dto.profile ? toMyTaxProfile(dto.profile) : null,
    estimate: dto.estimate ? toTdsEstimate(dto.estimate) : null,
    comparison: c
      ? {
          financialYear: c.financialYear,
          old: c.old ? toTdsEstimate(c.old) : null,
          new: c.new ? toTdsEstimate(c.new) : null,
          cheaper: c.cheaper,
          saving: Number(c.saving || 0),
        }
      : null,
    estimateError: dto.estimate_error?.message ?? null,
    regimeLocked: Boolean(dto.regime_locked),
    tdsAssigned: dto.tds_assigned !== false,
    tdsDeducted: Number(dto.tds_deducted || 0),
    joinedThisYear: Boolean(dto.joined_this_year),
    // An older server without windows means both are open.
    windows: { declaration: toWindow(dto.windows?.declaration), proof: toWindow(dto.windows?.proof) },
    perquisites: (dto.perquisites || []).map((p) => ({ label: p.label, description: p.description ?? '', taxable: Number(p.taxable || 0) })),
  };
}

/** The form as last saved; a first-time employee starts on the new regime, all blank. */
export function toTaxForm(profile: MyTaxProfile | null): TaxForm {
  const amounts = {} as TaxForm['amounts'];
  for (const key of AMOUNT_KEYS) amounts[key] = textOf(profile?.declarations[key]);
  const prev = profile?.previousEmployer;
  return {
    regime: profile?.regime ?? 'new',
    pan: profile?.pan ?? '',
    amounts,
    rent: textOf(profile?.rentPaidAnnual),
    metroCity: profile?.metroCity ?? false,
    landlordName: profile?.landlord?.name ?? '',
    landlordPan: profile?.landlord?.pan ?? '',
    lenderName: profile?.homeLoanLender?.name ?? '',
    lenderPan: profile?.homeLoanLender?.pan ?? '',
    previous: {
      income: textOf(prev?.income),
      tds: textOf(prev?.tds),
      professionalTax: textOf(prev?.professionalTax),
      providentFund: textOf(prev?.providentFund),
      employerName: prev?.employerName ?? '',
      employerTan: prev?.employerTan ?? '',
    },
  };
}

function party(name: string, pan: string): TaxPartyDto | null {
  const n = name.trim();
  const p = pan.trim().toUpperCase();
  return n || p ? { name: n || null, pan: p || null } : null;
}

/**
 * Numbers as numbers, blanks as null. Declarations the page doesn't show (employer NPS
 * set by payroll, an old HRA figure) are sent back unchanged so saving never clears them.
 */
export function toSaveBody(form: TaxForm, saved: MyTaxProfile | null): SaveMyTaxBodyDto {
  const declarations: MyTaxDeclarationsDto = {
    section80CCD2: saved?.declarations.section80CCD2 ?? null,
    hra: saved?.declarations.hra ?? null,
  };
  for (const key of AMOUNT_KEYS) declarations[key] = toNumber(form.amounts[key].trim());
  const p = form.previous;
  const previous = {
    income: toNumber(p.income.trim()),
    tds: toNumber(p.tds.trim()),
    professionalTax: toNumber(p.professionalTax.trim()),
    providentFund: toNumber(p.providentFund.trim()),
    employerName: p.employerName.trim() || null,
    employerTan: p.employerTan.trim().toUpperCase() || null,
  };
  return {
    regime: form.regime,
    pan: form.pan.trim().toUpperCase() || null,
    declarations,
    rent_paid_annual: toNumber(form.rent.trim()),
    metro_city: form.metroCity,
    landlord: party(form.landlordName, form.landlordPan),
    home_loan_lender: party(form.lenderName, form.lenderPan),
    previous_employer: Object.values(previous).some((v) => v !== null) ? previous : null,
  };
}
