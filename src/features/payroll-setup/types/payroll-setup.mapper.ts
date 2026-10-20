import type {
  AssignedEmployeeDto,
  AssignmentListResponseDto,
  DebitListResponseDto,
  DebitRuleDto,
  DebitVersionsResponseDto,
  Form16ReleaseDto,
  PartAEmployeeDto,
  PerquisiteDto,
  PreviousEmployerDto,
  ProofQueueEmployeeDto,
  SalaryComponentDto,
  TaxPartyDto,
  TaxProfileDto,
  TaxProofDocumentDto,
  TaxProofsDto,
  TdsChallanDto,
  TdsEstimateDto,
  TdsSettingsDto,
} from './payroll-setup.dto';
import type {
  AssignedEmployee,
  DebitListResult,
  DebitRule,
  DebitVersionHistory,
  Form16Release,
  PartAEmployee,
  Perquisite,
  PreviousEmployer,
  ProofQueueEmployee,
  SalaryComponent,
  TaxParty,
  TaxProfile,
  TaxProofDocument,
  TaxProofs,
  TaxTreatment,
  TdsChallan,
  TdsEstimate,
  TdsSettings,
} from './payroll-setup.model';

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function toComponent(dto: SalaryComponentDto): SalaryComponent {
  return {
    id: dto.id,
    name: dto.component_name,
    type: dto.component_type === 'debit' ? 'debit' : 'credit',
    description: dto.description,
    isSystem: Boolean(dto.is_system),
    displayOrder: Number(dto.display_order || 0),
    status: dto.status === 'inactive' ? 'inactive' : 'active',
    calculationType: dto.calculation_type === 'percentage' || dto.calculation_type === 'balance' ? dto.calculation_type : 'flat',
    isBasic: Boolean(dto.is_basic),
    percentageValue: toNumber(dto.percentage_value),
    percentageBasis: dto.percentage_basis || 'basic',
    basisComponentId: dto.basis_component_id ? Number(dto.basis_component_id) : null,
    taxTreatment: toTaxTreatment(dto.tax_treatment),
    subOrganizationId: dto.sub_organization_id ? Number(dto.sub_organization_id) : null,
  };
}

const TAX_TREATMENTS: TaxTreatment[] = ['taxable', 'hra', 'exempt_old', 'exempt_both', 'employer_nps'];

function toTaxTreatment(value: string | null | undefined): TaxTreatment {
  return TAX_TREATMENTS.includes(value as TaxTreatment) ? (value as TaxTreatment) : 'taxable';
}

export function toComponents(dtos: SalaryComponentDto[]): SalaryComponent[] {
  return (dtos || []).map(toComponent);
}

function parseMonthsArray(raw: number[] | string | null | undefined): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.map(Number).filter((m) => Number.isInteger(m) && m >= 1 && m <= 12);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter((m) => Number.isInteger(m) && m >= 1 && m <= 12) : null;
  } catch {
    return null;
  }
}

function toDebitType(value: string | null | undefined): DebitRule['debitType'] {
  return value === 'percentage' || value === 'slab' ? value : 'fixed';
}

export function toDebitRule(dto: DebitRuleDto): DebitRule {
  const freq = dto.frequency === 'selected_months' || dto.frequency === 'one_time' ? dto.frequency : 'monthly';
  return {
    id: dto.id,
    name: dto.debit_name,
    description: dto.description,
    status: dto.status === 'inactive' ? 'inactive' : 'active',
    category: dto.category || 'custom',
    isStatutory: Boolean(dto.is_statutory),
    subOrganizationId: dto.sub_organization_id ? Number(dto.sub_organization_id) : null,
    frequency: freq,
    applicableMonths: parseMonthsArray(dto.applicable_months),
    oneTimeMonth: dto.one_time_month || null,
    config: dto.config ?? null,
    debitType: toDebitType(dto.debit_type),
    fixedAmount: toNumber(dto.fixed_amount),
    percentageValue: toNumber(dto.percentage_value),
    referenceAmount: dto.reference_amount ?? null,
    breakdownItemId: dto.breakdown_item_id ?? null,
    breakdownItemName: dto.breakdown_item_name ?? null,
    enableMaxCap: Boolean(dto.enable_max_cap),
    maxCapAmount: toNumber(dto.max_cap_amount),
    enableAdditionalCharges: Boolean(dto.enable_additional_charges),
    additionalChargeType: dto.additional_charge_type ?? null,
    additionalChargeValue: toNumber(dto.additional_charge_value),
    assignedEmployeeCount: dto.assigned_employee_count ?? 0,
  };
}

export function toDebitList(dto: DebitListResponseDto): DebitListResult {
  return {
    debits: (dto.debits || []).map(toDebitRule),
    page: dto.page,
    pageSize: dto.pageSize,
    total: dto.total,
    pages: dto.pages,
  };
}

export function toDebitVersions(dto: DebitVersionsResponseDto): DebitVersionHistory {
  return {
    defaultEffectiveFrom: dto.default_effective_from,
    lastFinalizedDay: dto.last_finalized_day ?? null,
    versions: (dto.versions || []).map((v) => {
      const s = v.settings || ({} as DebitVersionsResponseDto['versions'][number]['settings']);
      const freq = s.frequency === 'selected_months' || s.frequency === 'one_time' ? s.frequency : 'monthly';
      return {
        id: v.id,
        effectiveFrom: v.effective_from ?? null,
        active: s.active !== false,
        debitType: toDebitType(s.debit_type),
        fixedAmount: toNumber(s.fixed_amount),
        percentageValue: toNumber(s.percentage_value),
        referenceAmount: s.reference_amount ?? null,
        breakdownItemId: s.breakdown_item_id ?? null,
        config: s.config ?? null,
        frequency: freq,
        applicableMonths: parseMonthsArray(s.applicable_months),
        oneTimeMonth: s.one_time_month || null,
        enableMaxCap: Boolean(s.enable_max_cap),
        maxCapAmount: toNumber(s.max_cap_amount),
        enableAdditionalCharges: Boolean(s.enable_additional_charges),
        additionalChargeType: s.additional_charge_type ?? null,
        additionalChargeValue: toNumber(s.additional_charge_value),
        reason: v.reason ?? null,
        createdByName: v.created_by_name ?? null,
        createdAt: v.created_at ?? null,
        canDelete: Boolean(v.can_delete),
      };
    }),
  };
}

export function toAssignedEmployee(dto: AssignedEmployeeDto): AssignedEmployee {
  return {
    employeeId: dto.employee_id,
    name: dto.employee_name || `Employee #${dto.employee_id}`,
    email: dto.email,
    designation: dto.designation,
    effectiveFrom: dto.effective_from ? String(dto.effective_from).slice(0, 10) : null,
    effectiveTo: dto.effective_to ? String(dto.effective_to).slice(0, 10) : null,
  };
}

export function toAssignments(dto: AssignmentListResponseDto): { employees: AssignedEmployee[]; total: number; pages: number } {
  return {
    employees: (dto.employees || []).map(toAssignedEmployee),
    total: dto.total,
    pages: dto.pages,
  };
}

export function toTaxProfile(dto: TaxProfileDto): TaxProfile {
  return {
    employeeId: dto.employee_id,
    employeeName: dto.employee_name,
    financialYear: dto.financial_year,
    regime: dto.regime === 'old' ? 'old' : 'new',
    pan: dto.pan ?? '',
    declarations: dto.declarations ?? {},
    rentPaidAnnual: toNumber(dto.rent_paid_annual),
    metroCity: Boolean(dto.metro_city),
    previousEmployer: toPreviousEmployer(dto.previous_employer),
    landlord: toTaxParty(dto.landlord),
    homeLoanLender: toTaxParty(dto.home_loan_lender),
    submittedAt: dto.submitted_at ?? null,
    proofs: dto.proofs === undefined ? null : toProofs(dto.proofs),
    proofsVerifiedAt: dto.proofs_verified_at ?? null,
    relief89: toNumber(dto.relief_89),
    estimatedAnnualTax: dto.estimated_annual_tax,
    monthlyTds: dto.monthly_tds,
  };
}

function toPreviousEmployer(dto: PreviousEmployerDto | null | undefined): PreviousEmployer | null {
  if (!dto) return null;
  return {
    income: toNumber(dto.income),
    tds: toNumber(dto.tds),
    professionalTax: toNumber(dto.professionalTax),
    providentFund: toNumber(dto.providentFund),
    employerName: dto.employerName ?? '',
    employerTan: dto.employerTan ?? '',
  };
}

export function toTaxParty(dto: TaxPartyDto | null | undefined): TaxParty | null {
  if (!dto || (!dto.name && !dto.pan)) return null;
  return { name: dto.name ?? '', pan: dto.pan ?? '' };
}

function toProofs(dto: TaxProofsDto | null): TaxProofs {
  const out: TaxProofs = {};
  for (const [key, value] of Object.entries(dto || {})) {
    const amount = toNumber(value as number | null);
    if (amount !== null) out[key as keyof TaxProofs] = amount;
  }
  return out;
}

export function toTdsSettings(dto: TdsSettingsDto): TdsSettings {
  return {
    employerTan: dto.employer_tan ?? '',
    employerPan: dto.employer_pan ?? '',
    signatoryName: dto.signatory_name ?? '',
    signatoryDesignation: dto.signatory_designation ?? '',
    place: dto.place ?? '',
    proofCutoffMonth: dto.proof_cutoff_month ? Number(dto.proof_cutoff_month) : null,
    declarationOpensOn: dto.declaration_opens_on ?? '',
    declarationClosesOn: dto.declaration_closes_on ?? '',
    proofOpensOn: dto.proof_opens_on ?? '',
    proofClosesOn: dto.proof_closes_on ?? '',
    subOrganizationId: Number(dto.sub_organization_id || 0),
  };
}

export function toForm16Release(dto: Form16ReleaseDto): Form16Release {
  return {
    financialYear: dto.financial_year,
    subOrganizationId: dto.sub_organization_id ?? null,
    releasedAt: dto.released_at,
  };
}

export function toChallan(dto: TdsChallanDto): TdsChallan {
  return {
    id: dto.id,
    financialYear: dto.financial_year,
    quarter: dto.quarter,
    bsrCode: dto.bsr_code ?? '',
    challanSerialNo: dto.challan_serial_no ?? '',
    depositDate: dto.deposit_date ?? '',
    amount: Number(dto.amount || 0),
    subOrganizationId: dto.sub_organization_id ?? null,
  };
}

export function toTdsEstimate(dto: TdsEstimateDto): TdsEstimate {
  return {
    financialYear: dto.financialYear,
    regime: (dto.regime ?? dto.profile?.regime) === 'old' ? 'old' : 'new',
    oneTimeIncome: Number(dto.oneTimeIncome || 0),
    salaryAnnual: Number(dto.salaryAnnual || 0),
    projectedAnnualGross: Number(dto.projectedAnnualGross || 0),
    standardDeduction: Number(dto.standardDeduction || 0),
    declarationTotal: Number(dto.declarationTotal || 0),
    declarationsApplied: dto.declarationsApplied ?? {},
    declarationsIgnored: dto.declarationsIgnored ?? [],
    taxableIncome: Number(dto.taxableIncome || 0),
    ageBand: dto.ageBand ?? 'default',
    slabTax: Number(dto.slabTax || 0),
    rebate: Number(dto.rebate || 0),
    rebateRelief: Number(dto.rebateRelief || 0),
    surchargeRate: Number(dto.surchargeRate || 0),
    surcharge: Number(dto.surcharge || 0),
    surchargeRelief: Number(dto.surchargeRelief || 0),
    taxBeforeCess: Number(dto.taxBeforeCess || 0),
    cess: Number(dto.cess || 0),
    annualTax: Number(dto.annualTax || 0),
    deductedBeforeCycle: Number(dto.deductedBeforeCycle || 0),
    monthlyTds: Number(dto.monthlyTds || 0),
    remainingMonths: Number(dto.remainingMonths || 12),
    isProvisional: Boolean(dto.isProvisional),
    exemptAllowances: Number(dto.exemptAllowances || 0),
    hraExemption: Number(dto.hraExemption || 0),
    autoDeductions: {
      epf: Number(dto.autoDeductions?.epf || 0),
      professionalTax: Number(dto.autoDeductions?.professionalTax || 0),
      employerNps: Number(dto.autoDeductions?.employerNps || 0),
    },
    previousEmployerIncome: Number(dto.previousEmployerIncome || 0),
    previousTds: Number(dto.previousTds || 0),
    noPanRateApplied: Boolean(dto.noPanRateApplied),
    proofMode: Boolean(dto.proofMode),
    perquisites: Number(dto.perquisites || 0),
    otherIncome: Number(dto.otherIncome || 0),
    relief89: Number(dto.relief89 || 0),
  };
}

/**
 * The settings upsert replaces the identity fields, so a partial change still sends them
 * all. Window dates are sent only by the windows card; left out, the server keeps them.
 */
export function toTdsSettingsPayload(input: TdsSettings, subOrganizationId: number, withWindows = false) {
  const base = {
    sub_organization_id: String(subOrganizationId),
    employer_tan: input.employerTan,
    employer_pan: input.employerPan,
    signatory_name: input.signatoryName,
    signatory_designation: input.signatoryDesignation,
    place: input.place,
    proof_cutoff_month: input.proofCutoffMonth,
  };
  if (!withWindows) return base;
  return {
    ...base,
    declaration_opens_on: input.declarationOpensOn || null,
    declaration_closes_on: input.declarationClosesOn || null,
    proof_opens_on: input.proofOpensOn || null,
    proof_closes_on: input.proofClosesOn || null,
  };
}

export function toTaxProofDocument(dto: TaxProofDocumentDto): TaxProofDocument {
  return {
    id: Number(dto.id),
    section: dto.section,
    fileName: dto.file_name,
    status: dto.status,
    remarks: dto.remarks ?? '',
    uploadedAt: dto.uploaded_at,
  };
}

export function toProofQueueEmployee(dto: ProofQueueEmployeeDto): ProofQueueEmployee {
  return {
    employeeId: Number(dto.employee_id),
    code: dto.employee_code ?? null,
    name: dto.name,
    pending: Number(dto.pending || 0),
    accepted: Number(dto.accepted || 0),
    rejected: Number(dto.rejected || 0),
  };
}

export function toPartAEmployee(dto: PartAEmployeeDto): PartAEmployee {
  return {
    employeeId: Number(dto.employee_id),
    code: dto.employee_code ?? null,
    name: dto.name,
    tds: Number(dto.tds || 0),
    partA: dto.part_a ? { fileName: dto.part_a.file_name, uploadedAt: dto.part_a.uploaded_at } : null,
  };
}

export function toPerquisite(dto: PerquisiteDto): Perquisite {
  return {
    id: Number(dto.id),
    perkType: dto.perk_type,
    label: dto.label,
    description: dto.description ?? '',
    value: Number(dto.value || 0),
    recovered: Number(dto.recovered || 0),
    taxable: Number(dto.taxable || 0),
    subOrganizationId: dto.sub_organization_id ?? null,
  };
}
