import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type {
  AssignmentListResponseDto,
  DebitListResponseDto,
  DebitRuleDto,
  DebitVersionsResponseDto,
  EmployeeSearchResultDto,
  PreviousEmployerDto,
  TaxPartyDto,
  TaxProofsDto,
  Form16CompaniesDto,
  Form16ReleasesResponseDto,
  FileLinkDto,
  PartAListDto,
  PartAUploadResultDto,
  PerquisiteDto,
  PerquisiteListDto,
  ProofQueueDto,
  TaxProofDocumentDto,
  TaxProofDocumentsDto,
  TaxProofStatusDto,
  SalaryComponentDto,
  TdsChallanDto,
  TdsPreviewResponseDto,
  RegimeComparisonResponseDto,
  TdsReadinessResponseDto,
  TaxConfigListResponseDto,
  TaxConfigDto,
  TaxConfigInputDto,
  TdsSettingsDto,
  TaxProfileResponseDto,
} from '../types/payroll-setup.dto';
import type { DebitFormInput, ComponentFormInput } from '../types/payroll-setup.model';
import { slabToConfig } from '../utils/deductionSlabs';
import { DEBIT_CATEGORIES } from '../constants/payroll-setup.constants';

export function listComponents(params: { type?: string; status?: string; subOrgId?: number | null } = {}) {
  return apiClient.get<{ components: SalaryComponentDto[] }>(
    '/payroll/components',
    {
      type: params.type || undefined,
      status: params.status || undefined,
      sub_org_id: params.subOrgId !== undefined && params.subOrgId !== null ? params.subOrgId : undefined,
    },
    { withAuth: true }
  );
}

export function createComponent(input: ComponentFormInput) {
  return apiClient.post<{ component: SalaryComponentDto }>(
    '/payroll/components',
    {
      component_name: input.name.trim(),
      component_type: input.type,
      description: input.description.trim() || null,
      display_order: Number(input.displayOrder) || 0,
      status: input.status,
      calculation_type: input.calculationType,
      is_basic: input.isBasic,
      percentage_value: input.calculationType === 'percentage' && input.percentageValue !== '' ? Number(input.percentageValue) : null,
      percentage_basis: input.calculationType === 'percentage' ? input.percentageBasis : 'basic',
      basis_component_id: input.calculationType === 'percentage' && input.percentageBasis === 'component' ? input.basisComponentId : null,
      tax_treatment: input.type === 'credit' ? input.taxTreatment : 'taxable',
      sub_organization_id: input.subOrganizationId ?? null,
    },
    { withAuth: true }
  );
}

export function updateComponent(id: number, input: ComponentFormInput) {
  return apiClient.put<{ component: SalaryComponentDto }>(
    `/payroll/components/${id}`,
    {
      component_name: input.name.trim(),
      component_type: input.type,
      description: input.description.trim() || null,
      display_order: Number(input.displayOrder) || 0,
      status: input.status,
      calculation_type: input.calculationType,
      is_basic: input.isBasic,
      percentage_value: input.calculationType === 'percentage' && input.percentageValue !== '' ? Number(input.percentageValue) : null,
      percentage_basis: input.calculationType === 'percentage' ? input.percentageBasis : 'basic',
      basis_component_id: input.calculationType === 'percentage' && input.percentageBasis === 'component' ? input.basisComponentId : null,
      tax_treatment: input.type === 'credit' ? input.taxTreatment : 'taxable',
      sub_organization_id: input.subOrganizationId ?? null,
    },
    { withAuth: true }
  );
}

export function deleteComponent(id: number) {
  return apiClient.delete<{ success: boolean }>(`/payroll/components/${id}`, { withAuth: true });
}

export function reorderComponents(orderedIds: number[]) {
  return apiClient.put<{ success: boolean; message: string }>(
    '/payroll/components/reorder',
    { ordered_ids: orderedIds },
    { withAuth: true }
  );
}

interface DebitListParams {
  search?: string;
  status?: string;
  category?: string;
  subOrgId?: number | null;
  page?: number;
  pageSize?: number;
}

export function listDebitRules(params: DebitListParams = {}) {
  return apiClient.get<DebitListResponseDto>(
    '/payroll/debits',
    {
      search: params.search || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      category: params.category && params.category !== 'all' ? params.category : undefined,
      sub_org_id: params.subOrgId !== undefined && params.subOrgId !== null ? params.subOrgId : undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    { withAuth: true }
  );
}

// Statutory rules keep their category settings in `config`; every other rule sends only
// the attendance flag and, for a slab rule, its bands.
function ruleConfig(input: DebitFormInput) {
  const statutory = DEBIT_CATEGORIES.find((c) => c.value === input.category)?.statutary;
  if (statutory) return input.config && Object.keys(input.config).length ? input.config : null;
  return {
    prorateByAttendance: input.debitType !== 'percentage' && input.prorateByAttendance,
    ...(input.debitType === 'slab' ? { slab: slabToConfig(input.slab) } : {}),
  };
}

function toRulePayload(input: DebitFormInput) {
  return {
    debit_name: input.name.trim(),
    description: input.description.trim() || null,
    status: input.status,
    category: input.category,
    sub_organization_id: input.subOrganizationId ?? null,
    frequency: input.frequency,
    applicable_months: input.frequency === 'selected_months' ? input.applicableMonths : null,
    one_time_month: input.frequency === 'one_time' ? input.oneTimeMonth || null : null,
    debit_type: input.debitType,
    fixed_amount: input.fixedAmount !== '' ? Number(input.fixedAmount) : null,
    percentage_value: input.percentageValue !== '' ? Number(input.percentageValue) : null,
    reference_amount: input.referenceAmount || null,
    breakdown_item_id: input.breakdownItemId ?? null,
    enable_max_cap: input.enableMaxCap,
    max_cap_amount: input.maxCapAmount !== '' ? Number(input.maxCapAmount) : null,
    enable_additional_charges: input.enableAdditionalCharges,
    additional_charge_type: input.enableAdditionalCharges ? input.additionalChargeType : null,
    additional_charge_value: input.additionalChargeValue !== '' ? Number(input.additionalChargeValue) : null,
    config: ruleConfig(input),
  };
}

export function createDebitRule(input: DebitFormInput) {
  return apiClient.post<{ id: number; rule: DebitRuleDto }>('/payroll/debits', toRulePayload(input), { withAuth: true });
}

/** Amount settings become a new version from `effective_from`; name, description and company change in place. */
export function updateDebitRule(id: number, input: DebitFormInput) {
  return apiClient.put<{ rule: DebitRuleDto; effective_from: string }>(
    `/payroll/debits/${id}`,
    {
      ...toRulePayload(input),
      effective_from: input.effectiveFrom || undefined,
      change_reason: input.changeReason.trim() || undefined,
    },
    { withAuth: true }
  );
}

export function updateDebitRuleStatus(id: number, status: 'active' | 'inactive', effectiveFrom?: string) {
  return apiClient.patch<{ rule: DebitRuleDto; effective_from: string }>(
    `/payroll/debits/${id}/status`,
    { status, effective_from: effectiveFrom || undefined },
    { withAuth: true }
  );
}

export function listDebitVersions(id: number) {
  return apiClient.get<DebitVersionsResponseDto>(`/payroll/debits/${id}/versions`, undefined, { withAuth: true });
}

export function deleteDebitVersion(id: number, versionId: number) {
  return apiClient.delete<{ success: boolean }>(`/payroll/debits/${id}/versions/${versionId}`, { withAuth: true });
}

export function deleteDebitRule(id: number) {
  return apiClient.delete<{ success: boolean }>(`/payroll/debits/${id}`, { withAuth: true });
}

export function listRuleAssignments(ruleId: number, page = 1, pageSize = 10) {
  return apiClient.get<AssignmentListResponseDto>(
    `/payroll/debits/${ruleId}/assignments`,
    { page, pageSize },
    { withAuth: true }
  );
}

export function searchEmployees(search: string) {
  return apiClient.get<EmployeeSearchResultDto>('/payroll/employees/search', { search: search || undefined }, { withAuth: true });
}

// A blank start date means "after the employee's last finalized payroll".
export function assignDebit(ruleId: number, employeeId: number, effectiveFrom?: string) {
  return apiClient.post<{ success: boolean }>(
    `/payroll/debits/${ruleId}/assignments`,
    { employee_id: employeeId, effective_from: effectiveFrom || undefined },
    { withAuth: true }
  );
}

export function assignBulk(ruleId: number, employeeIds: number[], effectiveFrom?: string) {
  return apiClient.post<{ success: boolean; count: number }>(
    `/payroll/debits/${ruleId}/assignments/bulk`,
    { employee_ids: employeeIds, effective_from: effectiveFrom || undefined },
    { withAuth: true }
  );
}

// A blank end date ends it with the last finalized payroll, or cancels it if nothing was paid.
export function removeAssignment(ruleId: number, employeeId: number, effectiveTo?: string) {
  return apiClient.delete<{ success: boolean }>(`/payroll/debits/${ruleId}/assignments/${employeeId}`, {
    withAuth: true,
    params: { effective_to: effectiveTo || undefined },
  });
}

export function getTaxProfile(employeeId: number, fy: string) {
  return apiClient.get<TaxProfileResponseDto>(`/payroll/tax-profiles/${employeeId}`, { fy }, { withAuth: true });
}

export function saveTaxProfile(employeeId: number, payload: {
  financial_year: string;
  regime: 'old' | 'new';
  pan: string;
  declarations: Record<string, number>;
  estimated_annual_tax?: number | null;
  rent_paid_annual?: number | null;
  metro_city?: boolean;
  previous_employer?: PreviousEmployerDto | null;
  landlord?: TaxPartyDto | null;
  home_loan_lender?: TaxPartyDto | null;
  /** Payroll only; an employee sending it gets 403. */
  proofs?: TaxProofsDto | null;
  /** Payroll only: relief under section 89 (Form 10E). */
  relief_89?: number | null;
  /** Resend after a 409 REGIME_LOCKED to switch regime anyway. */
  confirm_regime_change?: boolean;
}) {
  return apiClient.put<TaxProfileResponseDto>(`/payroll/tax-profiles/${employeeId}`, payload, { withAuth: true });
}

/** Status of every step in the TDS setup sequence. */
export function getTdsReadiness(fy: string) {
  return apiClient.get<TdsReadinessResponseDto>('/payroll/tds/readiness', { fy }, { withAuth: true });
}

/** Income-tax rates for a year, both regimes. Readable by any payroll viewer. */
export function listTaxConfig(fy: string) {
  return apiClient.get<TaxConfigListResponseDto>('/payroll/tax-config', { fy }, { withAuth: true });
}

/** Superadmin only — the server returns 403 for anyone else. */
export function saveTaxConfig(fy: string, regime: 'old' | 'new', body: TaxConfigInputDto) {
  return apiClient.put<{ config: TaxConfigDto }>(`/payroll/tax-config/${fy}/${regime}`, body, { withAuth: true });
}

/** Superadmin only — seeds a year from an existing one, flagged provisional. */
export function copyTaxConfig(targetFy: string, sourceFy: string) {
  return apiClient.post<{ copied: number; financial_year: string }>(
    `/payroll/tax-config/${targetFy}/copy`, { from: sourceFy }, { withAuth: true }
  );
}

/** Financial years that have income-tax rates configured. */
export function listTaxYears() {
  return apiClient.get<{ financial_years: string[] }>('/payroll/tax-years', undefined, { withAuth: true });
}

export function compareTaxRegimes(employeeId: number, fy: string, declarations: Record<string, number>) {
  return apiClient.post<RegimeComparisonResponseDto>(
    `/payroll/tax-regime-comparison/${employeeId}`,
    { declarations },
    { withAuth: true, params: { fy } }
  );
}

export function getTdsPreview(employeeId: number, fy: string) {
  return apiClient.get<TdsPreviewResponseDto>(`/payroll/tds-preview/${employeeId}`, { fy }, { withAuth: true });
}

export function getTdsSettings(subOrganizationId = 0) {
  return apiClient.get<{ settings: TdsSettingsDto }>(
    '/payroll/tds/settings',
    { sub_organization_id: subOrganizationId || undefined },
    { withAuth: true }
  );
}

export function saveTdsSettings(payload: Record<string, string | number | null>) {
  return apiClient.put<{ settings: TdsSettingsDto }>('/payroll/tds/settings', payload, { withAuth: true });
}

function companyParam(company: number | null): string {
  return company === null ? 'org' : String(company);
}

export function listTdsChallans(fy?: string, company?: number | null) {
  return apiClient.get<{ challans: TdsChallanDto[] }>(
    '/payroll/tds/challans',
    { fy, company: company === undefined ? undefined : companyParam(company) },
    { withAuth: true }
  );
}

export function saveTdsChallan(
  payload: {
    financial_year: string;
    quarter: string;
    bsr_code?: string;
    challan_serial_no?: string;
    deposit_date?: string;
    amount: number;
    sub_organization_id: number | null;
  },
  id?: number
) {
  return id
    ? apiClient.put<{ challan: TdsChallanDto }>(`/payroll/tds/challans/${id}`, payload, { withAuth: true })
    : apiClient.post<{ challan: TdsChallanDto }>('/payroll/tds/challans', payload, { withAuth: true });
}

export function deleteTdsChallan(id: number) {
  return apiClient.delete<{ success: boolean }>(`/payroll/tds/challans/${id}`, { withAuth: true });
}

export function getForm16Companies(employeeId: number, fy: string) {
  return apiClient.get<Form16CompaniesDto>(`/payroll/form16/${employeeId}`, { fy, format: 'json' }, { withAuth: true });
}

export function exportForm16(employeeId: number, fy: string, company?: number | null) {
  const body: { employeeIds: number[]; financialYear: string; company?: number | 'org' } = { employeeIds: [employeeId], financialYear: fy };
  if (company !== undefined) body.company = company === null ? 'org' : company;
  return apiClient.post<ExportJobDto>('/exports/form16', body, { withAuth: true });
}

/** Which companies have released a year's Form 16 to their employees. */
export function listForm16Releases(fy: string) {
  return apiClient.get<Form16ReleasesResponseDto>('/payroll/tds/form16-releases', { fy }, { withAuth: true });
}

/** Release (or withdraw) a year's Form 16 for one company; returns that year's releases. */
export function setForm16Release(fy: string, company: number | null, released: boolean) {
  return apiClient.put<Form16ReleasesResponseDto>(
    '/payroll/tds/form16-releases',
    { financial_year: fy, company: companyParam(company), released },
    { withAuth: true }
  );
}

/** Form 24Q data for one quarter, queued in the Download Centre. */
export function exportTdsQuarterlyReturn(fy: string, quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', company: number | null) {
  return apiClient.post<ExportJobDto>(
    '/exports/tds-quarterly-return',
    { financialYear: fy, quarter, company: company === null ? 'org' : company },
    { withAuth: true }
  );
}

/** Employees with Form 12BB proofs this year, those waiting for review first. */
export function listProofQueue(fy: string) {
  return apiClient.get<ProofQueueDto>('/payroll/tax-proofs', { fy }, { withAuth: true });
}

export function listEmployeeProofs(employeeId: number, fy: string) {
  return apiClient.get<TaxProofDocumentsDto>(`/payroll/tax-proofs/employee/${employeeId}`, { fy }, { withAuth: true });
}

export function getProofUrl(id: number) {
  return apiClient.get<FileLinkDto>(`/payroll/tax-proofs/${id}/url`, undefined, { withAuth: true });
}

/** Remarks are required when rejecting; the employee sees them. */
export function reviewProof(id: number, status: TaxProofStatusDto, remarks?: string) {
  return apiClient.patch<TaxProofDocumentDto>(`/payroll/tax-proofs/${id}`, { status, remarks: remarks || undefined }, { withAuth: true });
}

/** Employees paid by one company in a year, with whether their TRACES Part A is on file. */
export function listPartA(fy: string, company: number | null) {
  return apiClient.get<PartAListDto>('/payroll/tds/form16-part-a', { fy, company: companyParam(company) }, { withAuth: true });
}

/** Files are matched to employees by the PAN in the file name, unless `employeeId` is given for a single file. */
export function uploadPartA(fy: string, company: number | null, files: File[], employeeId?: number) {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  form.append('financial_year', fy);
  form.append('company', companyParam(company));
  if (employeeId) form.append('employee_id', String(employeeId));
  return apiClient.post<PartAUploadResultDto>('/payroll/tds/form16-part-a', form, { withAuth: true });
}

export function removePartA(fy: string, company: number | null, employeeId: number) {
  return apiClient.delete<{ success: boolean }>('/payroll/tds/form16-part-a', {
    withAuth: true,
    params: { fy, company: companyParam(company), employee_id: employeeId },
  });
}

export interface PerquisiteInput {
  employee_id: number;
  financial_year: string;
  perk_type: string;
  value: number | null;
  recovered: number | null;
  description: string | null;
}

export function listPerquisites(employeeId: number, fy: string) {
  return apiClient.get<PerquisiteListDto>('/payroll/perquisites', { employee_id: employeeId, fy }, { withAuth: true });
}

export function savePerquisite(input: PerquisiteInput, id?: number) {
  return id
    ? apiClient.put<PerquisiteDto>(`/payroll/perquisites/${id}`, input, { withAuth: true })
    : apiClient.post<PerquisiteDto>('/payroll/perquisites', input, { withAuth: true });
}

export function deletePerquisite(id: number) {
  return apiClient.delete<{ success: boolean }>(`/payroll/perquisites/${id}`, { withAuth: true });
}
