import type { ComponentInput, SalaryDriver, SalaryPlan } from '../utils/salary';
import type { EmployeeDetailDto, Gender, ManagerDto, PaymentMode, ShiftSource, WeekOffConfig } from './employees.dto';

export interface EmployeeFormState {
  employeeCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: Gender | '';
  dateOfBirth: string;
  subOrganizationId: number | null;
  departmentId: number | null;
  roleId: number | null;
  designation: string;
  reportingManager: ManagerDto | null;
  employmentTypeId: number | null;
  codeTouched: boolean;
  joiningDate: string;
  probationMonths: string;
  noticePeriodDays: string;
  siteIds: number[];
  primarySiteId: number | null;
  policyId: number | null;
  locationAccess: string;
  shiftSource: ShiftSource;
  shiftTemplateId: number | null;
  customShiftStart: string;
  customShiftEnd: string;
  customBreak: string;
  weekOffMode: 'policy' | 'custom';
  weekOffConfig: WeekOffConfig | null;
  driver: SalaryDriver;
  componentInputs: Record<number, ComponentInput>;
  debitOverrides: Record<number, boolean>;
  paymentMode: PaymentMode;
  esicIpNumber: string;
  bankAccountNo: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  panNumber: string;
  aadhaarNumber: string;
  pfUan: string;
}

export type FormErrors = Partial<Record<string, string>>;

export function emptyForm(): EmployeeFormState {
  return {
    employeeCode: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    subOrganizationId: null,
    departmentId: null,
    roleId: null,
    designation: '',
    reportingManager: null,
    employmentTypeId: null,
    codeTouched: false,
    joiningDate: new Date().toISOString().slice(0, 10),
    probationMonths: '',
    noticePeriodDays: '',
    siteIds: [],
    primarySiteId: null,
    policyId: null,
    locationAccess: 'assigned',
    shiftSource: 'policy',
    shiftTemplateId: null,
    customShiftStart: '09:00',
    customShiftEnd: '18:00',
    customBreak: '60',
    weekOffMode: 'policy',
    weekOffConfig: null,
    driver: { source: 'ctc', value: 0 },
    componentInputs: {},
    debitOverrides: {},
    paymentMode: 'bank',
    esicIpNumber: '',
    bankAccountNo: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    panNumber: '',
    aadhaarNumber: '',
    pfUan: '',
  };
}

export function formFromDetail(d: EmployeeDetailDto): EmployeeFormState {
  return {
    ...emptyForm(),
    employeeCode: d.employee_code || '',
    firstName: d.first_name || '',
    middleName: d.middle_name || '',
    lastName: d.last_name || '',
    email: d.email || '',
    phone: d.phone || '',
    gender: d.gender || '',
    dateOfBirth: d.date_of_birth || '',
    subOrganizationId: d.sub_organization_id,
    departmentId: d.department_id,
    roleId: d.role_id,
    designation: d.designation || '',
    reportingManager: d.reporting_manager
      ? { id: d.reporting_manager.id, name: d.reporting_manager.name || '', employee_code: d.reporting_manager.employee_code, designation: null }
      : null,
    employmentTypeId: d.employment_type_id,
    codeTouched: true,
    joiningDate: d.employment_start_date || '',
    probationMonths: d.probation_months !== null ? String(d.probation_months) : '',
    noticePeriodDays: d.notice_period_days !== null ? String(d.notice_period_days) : '',
    siteIds: d.site_ids,
    primarySiteId: d.primary_site_id,
    policyId: d.policy_overridden ? d.policy_id : null,
    locationAccess: d.location_access || 'assigned',
    shiftSource: d.shift_source || 'policy',
    shiftTemplateId: d.shift_template_id,
    customShiftStart: d.shift_source === 'custom' && d.shift_start ? d.shift_start : '09:00',
    customShiftEnd: d.shift_source === 'custom' && d.shift_end ? d.shift_end : '18:00',
    customBreak: d.shift_break_minutes !== null && d.shift_break_minutes !== undefined ? String(d.shift_break_minutes) : '60',
    weekOffMode: d.week_off_config ? 'custom' : 'policy',
    weekOffConfig: d.week_off_config,
    driver: d.ctc ? { source: 'ctc', value: d.ctc } : { source: 'gross', value: d.monthly_gross || 0 },
    paymentMode: d.payment_mode || 'bank',
    esicIpNumber: d.esic_ip_number || '',
    bankAccountNo: d.bank_account_no || '',
    ifscCode: d.ifsc_code || '',
    bankName: d.bank_name || '',
    branchName: d.branch_name || '',
    panNumber: d.pan_number || '',
    aadhaarNumber: d.aadhaar_number || '',
    pfUan: d.pf_uan || '',
  };
}

const blank = (v: string) => (v.trim() === '' ? null : v.trim());
const intOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

export function toPayload(f: EmployeeFormState, plan: SalaryPlan, timingMode: string | null) {
  return {
    employee_code: blank(f.employeeCode),
    first_name: f.firstName.trim(),
    middle_name: blank(f.middleName),
    last_name: f.lastName.trim(),
    email: blank(f.email),
    phone: blank(f.phone),
    gender: f.gender || null,
    date_of_birth: f.dateOfBirth || null,
    sub_organization_id: f.subOrganizationId,
    department_id: f.departmentId,
    role_id: f.roleId,
    designation: blank(f.designation),
    reporting_manager_id: f.reportingManager?.id ?? null,
    employment_type_id: f.employmentTypeId,
    employment_start_date: f.joiningDate || null,
    probation_months: intOrNull(f.probationMonths),
    notice_period_days: intOrNull(f.noticePeriodDays),
    site_ids: f.siteIds,
    primary_site_id: f.primarySiteId,
    policy_id: f.policyId,
    location_access: f.locationAccess,
    shift_source: timingMode === 'fixed_time' ? f.shiftSource : 'policy',
    shift_template_id: timingMode === 'fixed_time' && f.shiftSource === 'template' ? f.shiftTemplateId : null,
    shift_start: timingMode === 'fixed_time' && f.shiftSource === 'custom' ? f.customShiftStart : null,
    shift_end: timingMode === 'fixed_time' && f.shiftSource === 'custom' ? f.customShiftEnd : null,
    shift_break_minutes: timingMode === 'fixed_time' && f.shiftSource === 'custom' ? intOrNull(f.customBreak) : null,
    week_off_config: timingMode !== 'roster' && f.weekOffMode === 'custom' ? f.weekOffConfig : null,
    ctc: plan.gross > 0 ? plan.ctcAnnual : null,
    monthly_gross: plan.gross > 0 ? plan.gross : null,
    salary_breakdown: plan.gross > 0 ? plan.lines.map((l) => ({ component_id: l.componentId, amount: l.amount })) : [],
    debit_ids: plan.debits.filter((d) => d.selected).map((d) => d.rule.id),
    payment_mode: f.paymentMode,
    esic_ip_number: blank(f.esicIpNumber),
    bank_account_no: blank(f.bankAccountNo),
    ifsc_code: blank(f.ifscCode),
    bank_name: blank(f.bankName),
    branch_name: blank(f.branchName),
    pan_number: blank(f.panNumber),
    aadhaar_number: blank(f.aadhaarNumber),
    pf_uan: blank(f.pfUan),
  };
}
