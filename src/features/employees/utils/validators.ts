import type { FormStepKey } from '../constants/employees.constants';
import type { EmployeeFormState, FormErrors } from '../types/employees.form';
import type { SalaryPlan } from './salary';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[6-9][0-9]{9}$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR = /^[2-9][0-9]{11}$/;
export const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UAN = /^[0-9]{12}$/;
const ESIC = /^[0-9]{10}$/;
const ACCOUNT = /^[0-9]{9,18}$/;
const CODE = /^[A-Za-z0-9\-_/]{1,40}$/;

export function phoneDigits(v: string) {
  const d = v.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  return d.length > 10 ? d.slice(-10) : d;
}

function basic(f: EmployeeFormState): FormErrors {
  const e: FormErrors = {};
  if (f.employeeCode.trim() && !CODE.test(f.employeeCode.trim())) e.employee_code = 'Use letters, numbers, - _ /';
  if (!f.firstName.trim()) e.first_name = 'First name is required';
  if (!f.lastName.trim()) e.last_name = 'Last name is required';
  const email = f.email.trim();
  const phone = f.phone.trim();
  if (!email && !phone) {
    e.email = 'Enter email or phone';
    e.phone = 'Enter email or phone';
  }
  if (email && !EMAIL.test(email)) e.email = 'Email is invalid';
  if (phone && !PHONE.test(phoneDigits(phone))) e.phone = 'Enter a valid 10-digit mobile number';
  if (f.dateOfBirth && f.joiningDate && f.dateOfBirth >= f.joiningDate) e.date_of_birth = 'Must be before joining date';
  return e;
}

function job(f: EmployeeFormState, needsSubOrg: boolean): FormErrors {
  const e: FormErrors = {};
  if (needsSubOrg && !f.subOrganizationId) e.sub_organization_id = 'Select a sub-organization';
  if (!f.departmentId) e.department_id = 'Select a department';
  if (!f.roleId) e.role_id = 'Select a role';
  if (!f.employmentTypeId) e.employment_type_id = 'Select employment type';
  if (!f.joiningDate) e.employment_start_date = 'Joining date is required';
  if (!f.primarySiteId) e.primary_site_id = 'Select a primary site';
  const probation = Number(f.probationMonths);
  if (f.probationMonths.trim() && (!Number.isInteger(probation) || probation < 0 || probation > 24)) e.probation_months = '0 to 24 months';
  const notice = Number(f.noticePeriodDays);
  if (f.noticePeriodDays.trim() && (!Number.isInteger(notice) || notice < 0 || notice > 365)) e.notice_period_days = '0 to 365 days';
  return e;
}

function schedule(f: EmployeeFormState, effectivePolicyId: number | null, timingMode: string | null): FormErrors {
  const e: FormErrors = {};
  if (!effectivePolicyId) e.policy_id = 'Select a policy';
  if (timingMode === 'fixed_time' && f.shiftSource === 'template' && !f.shiftTemplateId) e.shift_template_id = 'Pick a shift';
  if (timingMode === 'fixed_time' && f.shiftSource === 'custom') {
    if (!f.customShiftStart) e.shift_start = 'Start time is required';
    if (!f.customShiftEnd) e.shift_end = 'End time is required';
    if (f.customShiftStart && f.customShiftStart === f.customShiftEnd) e.shift_end = 'End must differ from start';
    const brk = Number(f.customBreak || 0);
    if (!Number.isInteger(brk) || brk < 0 || brk > 240) e.shift_break_minutes = '0 to 240 minutes';
  }
  if (timingMode !== 'roster' && f.weekOffMode === 'custom' && f.weekOffConfig) {
    for (const [day, conf] of Object.entries(f.weekOffConfig)) {
      if (typeof conf !== 'object' || !conf || conf.offType === 'working' || conf.pattern !== 'specific_weeks') continue;
      if (![1, 2, 3, 4, 5].some((n) => conf[`specificWeek${n}` as keyof typeof conf])) e.week_off_config = `Pick at least one week for ${day}`;
    }
  }
  return e;
}

function salary(plan: SalaryPlan): FormErrors {
  return plan.error ? { salary_breakdown: plan.error } : {};
}

function bank(f: EmployeeFormState): FormErrors {
  const e: FormErrors = {};
  const up = (v: string) => v.replace(/\s+/g, '').toUpperCase();
  if (f.bankAccountNo.trim() && !ACCOUNT.test(up(f.bankAccountNo))) e.bank_account_no = '9 to 18 digits';
  if (f.ifscCode.trim() && !IFSC.test(up(f.ifscCode))) e.ifsc_code = 'IFSC is invalid';
  if (f.bankAccountNo.trim() && !f.ifscCode.trim()) e.ifsc_code = 'IFSC is required with account number';
  if (f.panNumber.trim() && !PAN.test(up(f.panNumber))) e.pan_number = 'Format ABCDE1234F';
  if (f.aadhaarNumber.trim() && !AADHAAR.test(up(f.aadhaarNumber))) e.aadhaar_number = '12 digits';
  if (f.pfUan.trim() && !UAN.test(up(f.pfUan))) e.pf_uan = '12 digits';
  if (f.esicIpNumber.trim() && !ESIC.test(up(f.esicIpNumber))) e.esic_ip_number = '10 digits';
  return e;
}

export function validateStep(
  step: FormStepKey,
  f: EmployeeFormState,
  ctx: { plan: SalaryPlan; effectivePolicyId: number | null; needsSubOrg: boolean; timingMode: string | null }
): FormErrors {
  switch (step) {
    case 'basic': return basic(f);
    case 'job': return job(f, ctx.needsSubOrg);
    case 'schedule': return schedule(f, ctx.effectivePolicyId, ctx.timingMode);
    case 'salary': return salary(ctx.plan);
    case 'bank': return bank(f);
    default: return {};
  }
}
