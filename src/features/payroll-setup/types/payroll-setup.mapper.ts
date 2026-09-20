import type {
  AssignedEmployeeDto,
  AssignmentListResponseDto,
  DebitListResponseDto,
  DebitRuleDto,
  SalaryComponentDto,
  TaxProfileDto,
  TdsChallanDto,
  TdsSettingsDto,
} from './payroll-setup.dto';
import type {
  AssignedEmployee,
  DebitListResult,
  DebitRule,
  SalaryComponent,
  TaxProfile,
  TdsChallan,
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
    calculationType: dto.calculation_type === 'percentage' ? 'percentage' : 'flat',
    percentageValue: toNumber(dto.percentage_value),
    percentageBasis: dto.percentage_basis || 'basic',
    basisComponentId: dto.basis_component_id ? Number(dto.basis_component_id) : null,
  };
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

export function toDebitRule(dto: DebitRuleDto): DebitRule {
  const freq = dto.frequency === 'selected_months' || dto.frequency === 'one_time' ? dto.frequency : 'monthly';
  return {
    id: dto.id,
    name: dto.debit_name,
    description: dto.description,
    status: dto.status === 'inactive' ? 'inactive' : 'active',
    category: dto.category || 'custom',
    isStatutory: Boolean(dto.is_statutory),
    frequency: freq,
    applicableMonths: parseMonthsArray(dto.applicable_months),
    oneTimeMonth: dto.one_time_month || null,
    config: dto.config ?? null,
    debitType: dto.debit_type === 'percentage' ? 'percentage' : 'fixed',
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

export function toAssignedEmployee(dto: AssignedEmployeeDto): AssignedEmployee {
  return {
    employeeId: dto.employee_id,
    name: dto.employee_name || `Employee #${dto.employee_id}`,
    email: dto.email,
    designation: dto.designation,
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
    estimatedAnnualTax: dto.estimated_annual_tax,
    monthlyTds: dto.monthly_tds,
  };
}

export function toTdsSettings(dto: TdsSettingsDto): TdsSettings {
  return {
    employerTan: dto.employer_tan ?? '',
    employerPan: dto.employer_pan ?? '',
    signatoryName: dto.signatory_name ?? '',
    signatoryDesignation: dto.signatory_designation ?? '',
    place: dto.place ?? '',
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
  };
}
