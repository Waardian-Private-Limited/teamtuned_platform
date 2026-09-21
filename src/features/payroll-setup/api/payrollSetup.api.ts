import { apiClient } from '@/lib/apiClient';
import type {
  AssignmentListResponseDto,
  DebitListResponseDto,
  DebitRuleDto,
  EmployeeSearchResultDto,
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

export function listComponents(params: { type?: string; status?: string } = {}) {
  return apiClient.get<{ components: SalaryComponentDto[] }>(
    '/payroll/components',
    {
      type: params.type || undefined,
      status: params.status || undefined,
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
      percentage_value: input.calculationType === 'percentage' && input.percentageValue !== '' ? Number(input.percentageValue) : null,
      percentage_basis: input.calculationType === 'percentage' ? input.percentageBasis : 'basic',
      basis_component_id: input.calculationType === 'percentage' && input.percentageBasis === 'component' ? input.basisComponentId : null,
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
      percentage_value: input.calculationType === 'percentage' && input.percentageValue !== '' ? Number(input.percentageValue) : null,
      percentage_basis: input.calculationType === 'percentage' ? input.percentageBasis : 'basic',
      basis_component_id: input.calculationType === 'percentage' && input.percentageBasis === 'component' ? input.basisComponentId : null,
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
      page: params.page,
      pageSize: params.pageSize,
    },
    { withAuth: true }
  );
}

function toRulePayload(input: DebitFormInput) {
  return {
    debit_name: input.name.trim(),
    description: input.description.trim() || null,
    status: input.status,
    category: input.category,
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
    config: input.config && Object.keys(input.config).length ? input.config : null,
  };
}

export function createDebitRule(input: DebitFormInput) {
  return apiClient.post<{ id: number; rule: DebitRuleDto }>('/payroll/debits', toRulePayload(input), { withAuth: true });
}

export function updateDebitRule(id: number, input: DebitFormInput) {
  return apiClient.put<{ rule: DebitRuleDto }>(`/payroll/debits/${id}`, toRulePayload(input), { withAuth: true });
}

export function updateDebitRuleStatus(id: number, status: string) {
  return apiClient.patch<{ rule: DebitRuleDto }>(`/payroll/debits/${id}/status`, { status }, { withAuth: true });
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

export function assignDebit(ruleId: number, employeeId: number) {
  return apiClient.post<{ success: boolean }>(`/payroll/debits/${ruleId}/assignments`, { employee_id: employeeId }, { withAuth: true });
}

export function assignBulk(ruleId: number, employeeIds: number[]) {
  return apiClient.post<{ success: boolean; count: number }>(`/payroll/debits/${ruleId}/assignments/bulk`, { employee_ids: employeeIds }, { withAuth: true });
}

export function removeAssignment(ruleId: number, employeeId: number) {
  return apiClient.delete<{ success: boolean }>(`/payroll/debits/${ruleId}/assignments/${employeeId}`, { withAuth: true });
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

export function saveTdsSettings(payload: Record<string, string>) {
  return apiClient.put<{ settings: TdsSettingsDto }>('/payroll/tds/settings', payload, { withAuth: true });
}

export function listTdsChallans(fy?: string) {
  return apiClient.get<{ challans: TdsChallanDto[] }>('/payroll/tds/challans', { fy }, { withAuth: true });
}

export function saveTdsChallan(payload: { financial_year: string; quarter: string; bsr_code?: string; challan_serial_no?: string; deposit_date?: string; amount: number }, id?: number) {
  return id
    ? apiClient.put<{ challan: TdsChallanDto }>(`/payroll/tds/challans/${id}`, payload, { withAuth: true })
    : apiClient.post<{ challan: TdsChallanDto }>('/payroll/tds/challans', payload, { withAuth: true });
}

export function deleteTdsChallan(id: number) {
  return apiClient.delete<{ success: boolean }>(`/payroll/tds/challans/${id}`, { withAuth: true });
}

export async function downloadForm16(employeeId: number, fy: string): Promise<{ blob: Blob; filename: string }> {
  const blob = await apiClient<Blob>(`/payroll/form16/${employeeId}?fy=${encodeURIComponent(fy)}&format=pdf`, {
    method: 'GET',
    withAuth: true,
    responseType: 'blob',
  });
  return { blob, filename: `Form16_${fy}.pdf` };
}
