import { apiClient } from '@/lib/apiClient';
import type {
  EmployeeDetailDto,
  EmployeeListResponseDto,
  EmployeeStatus,
  FormOptionsDto,
  IfscDto,
  ManagerDto,
  PolicyPreviewDto,
  JobEventDto,
  AuditEntryDto,
  HistoryPageDto,
  ContractTermDto,
  ContractRenewalDto,
} from '../types/employees.dto';

const auth = { withAuth: true };

export interface ListParams {
  search?: string;
  status?: EmployeeStatus | 'all';
  page: number;
  pageSize: number;
  subOrgId?: number | null;
  gradeId?: number | null;
  costCentreId?: number | null;
  contractEndingDays?: number | null;
}

export function listEmployees(params: ListParams) {
  return apiClient.get<EmployeeListResponseDto>(
    '/employees',
    {
      search: params.search || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      page: params.page,
      pageSize: params.pageSize,
      subOrgId: params.subOrgId ?? undefined,
      gradeId: params.gradeId ?? undefined,
      costCentreId: params.costCentreId ?? undefined,
      contractEndingDays: params.contractEndingDays ?? undefined,
    },
    auth
  );
}

export function getEmployee(id: number) {
  return apiClient.get<EmployeeDetailDto>(`/employees/${id}`, undefined, auth);
}

export function getFormOptions(subOrgId: number | null, withCode: boolean) {
  return apiClient.get<FormOptionsDto>(
    '/employees/form-options',
    { forSubOrgId: subOrgId ?? undefined, withCode: withCode ? 1 : undefined },
    auth
  );
}

export function previewPolicy(params: {
  subOrgId: number | null;
  departmentId: number | null;
  roleId: number | null;
  siteIds: number[];
  employmentTypeId: number | null;
  gradeId: number | null;
}) {
  return apiClient.get<PolicyPreviewDto>(
    '/employees/policy-preview',
    {
      subOrgId: params.subOrgId ?? undefined,
      departmentId: params.departmentId ?? undefined,
      roleId: params.roleId ?? undefined,
      siteIds: params.siteIds.length ? params.siteIds.join(',') : undefined,
      employmentTypeId: params.employmentTypeId ?? undefined,
      gradeId: params.gradeId ?? undefined,
    },
    auth
  );
}

export function searchManagers(search: string, subOrgId: number | null, excludeId: number | null) {
  return apiClient.get<{ managers: ManagerDto[] }>(
    '/employees/managers',
    { search: search || undefined, forSubOrgId: subOrgId ?? undefined, excludeId: excludeId ?? undefined },
    auth
  );
}

export function lookupIfsc(code: string) {
  return apiClient.get<IfscDto>(`/employees/ifsc/${encodeURIComponent(code)}`, undefined, auth);
}

export function createEmployee(body: Record<string, unknown>) {
  return apiClient.post<{ id: number; employee_code: string }>('/employees', body, auth);
}

export function updateEmployee(id: number, body: Record<string, unknown>) {
  return apiClient.put<{ id: number; employee_code: string }>(`/employees/${id}`, body, auth);
}

export function changeEmployeeStatus(id: number, body: { status: EmployeeStatus; exit_date?: string; reason?: string }) {
  return apiClient.patch<{ id: number; status: EmployeeStatus }>(`/employees/${id}/status`, body, auth);
}

export function deleteEmployee(id: number) {
  return apiClient.delete<{ id: number }>(`/employees/${id}`, auth);
}

export interface EmploymentTypeDto {
  id: number;
  sub_organization_id: number | null;
  name: string;
  code: string;
  description: string | null;
  is_fixed_term: boolean;
  default_contract_months: number | null;
  default_probation_months: number | null;
  default_notice_days: number | null;
  display_order: number;
  status: 'active' | 'inactive';
  employee_count: number;
}

export interface CodeSettingsDto {
  prefix: string;
  separator: string;
  digits: number;
  editable: boolean;
}

export function listEmploymentTypes() {
  return apiClient.get<{ employment_types: EmploymentTypeDto[] }>('/employment-types', { status: 'all' }, auth);
}

export function saveEmploymentType(id: number | null, body: Record<string, unknown>) {
  return id ? apiClient.put<EmploymentTypeDto>(`/employment-types/${id}`, body, auth) : apiClient.post<EmploymentTypeDto>('/employment-types', body, auth);
}

export function deleteEmploymentType(id: number) {
  return apiClient.delete<{ id: number }>(`/employment-types/${id}`, auth);
}

export type BirthdayVisibility = 'primary_site' | 'my_sites' | 'sub_org' | 'organization';

export interface BirthdaySettingsDto {
  show: boolean;
  visibility: BirthdayVisibility;
  likes: boolean;
  wishes: boolean;
}

export interface EmployeeSettingsDto {
  code: CodeSettingsDto;
  birthdays: BirthdaySettingsDto;
}

interface EmployeeSettingsResponse {
  sub_organization_id: number | null;
  inherited: boolean;
  settings: EmployeeSettingsDto;
  birthday_visibility_options: BirthdayVisibility[];
  next_employee_code: string;
}

export function getEmployeeSettings(subOrgId: number | null) {
  return apiClient.get<EmployeeSettingsResponse>(
    '/employees/settings',
    { forSubOrgId: subOrgId ?? undefined },
    auth
  );
}

/** Saves only the sections sent; the others keep their values. */
export function updateEmployeeSettings(subOrgId: number | null, settings: Partial<EmployeeSettingsDto>) {
  return apiClient.put<EmployeeSettingsResponse>(
    '/employees/settings',
    { sub_organization_id: subOrgId, settings },
    auth
  );
}

export function getJobHistory(id: number, page: number, pageSize = 20) {
  return apiClient.get<HistoryPageDto<JobEventDto>>(`/employees/${id}/job-history`, { page, pageSize }, auth);
}

export function getAuditLog(id: number, page: number, pageSize = 20) {
  return apiClient.get<HistoryPageDto<AuditEntryDto>>(`/employees/${id}/audit-log`, { page, pageSize }, auth);
}

export function getContractHistory(id: number) {
  return apiClient.get<{ terms: ContractTermDto[] }>(`/employees/${id}/contract`, undefined, auth);
}

/** Extends the current term: a new end date, or a number of months from the day after the current end. */
export function renewContract(id: number, body: { end_date?: string; months?: number; reason?: string }) {
  return apiClient.post<ContractRenewalDto>(`/employees/${id}/contract/renew`, body, auth);
}
