import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type {
  ItemDetailResponseDto,
  ItemDto,
  ItemListResponseDto,
  PayrollSettingsDto,
  PayrollSettingsPatchDto,
  PreviewDto,
  RunDto,
  RunListResponseDto,
} from '../types/payrollRuns.dto';
import type { ItemFilters } from '../types/payrollRuns.model';

const auth = { withAuth: true };

export function listRuns(month: string, subOrgId: number | null) {
  return apiClient.get<RunListResponseDto>('/payroll-runs', { month, subOrgId: subOrgId ?? undefined }, auth);
}

export function startRuns(month: string, subOrganizationId?: number | null) {
  const body: Record<string, unknown> = { month };
  if (subOrganizationId !== undefined) body.sub_organization_id = subOrganizationId;
  return apiClient.post<{ runs: RunDto[] }>('/payroll-runs/start', body, auth);
}

/** Which payroll a preview is for: the month, the paying company (null: the organization) and the pay period. */
export interface PreviewTarget {
  month: string;
  subOrganizationId: number | null;
  periodStart: string;
  periodEnd: string;
}

const previewParams = (t: PreviewTarget) => ({
  month: t.month,
  sub_organization_id: t.subOrganizationId ?? 0,
  period_start: t.periodStart,
  period_end: t.periodEnd,
});

export function startPreview(target: PreviewTarget, refresh = false) {
  return apiClient.post<PreviewDto>('/payroll-runs/preview', { ...previewParams(target), refresh }, auth);
}

export function getPreview(target: PreviewTarget) {
  return apiClient.get<PreviewDto>('/payroll-runs/preview', previewParams(target), auth);
}

export function getPreviewItem(target: PreviewTarget, employeeId: number) {
  return apiClient.get<ItemDetailResponseDto>(`/payroll-runs/preview/items/${employeeId}`, previewParams(target), auth);
}

export function deleteRun(id: number) {
  return apiClient.delete<{ deleted: boolean; id: number }>(`/payroll-runs/${id}`, auth);
}

export function getRun(id: number) {
  return apiClient.get<RunDto>(`/payroll-runs/${id}`, undefined, auth);
}

export function listItems(id: number, filters: ItemFilters, page: number, pageSize: number) {
  return apiClient.get<ItemListResponseDto>(
    `/payroll-runs/${id}/items`,
    {
      page,
      pageSize,
      search: filters.search.trim() || undefined,
      status: filters.status === 'all' ? undefined : filters.status,
      site_id: filters.siteId ?? undefined,
      department_id: filters.departmentId ?? undefined,
      sort: filters.sort,
      dir: filters.dir,
    },
    auth
  );
}

export function getItem(id: number, employeeId: number) {
  return apiClient.get<ItemDetailResponseDto>(`/payroll-runs/${id}/items/${employeeId}`, undefined, auth);
}

export function recompute(id: number) {
  return apiClient.post<RunDto>(`/payroll-runs/${id}/recompute`, {}, auth);
}

export function setHold(id: number, employeeId: number, hold: boolean, reason?: string) {
  return apiClient.post<ItemDto>(`/payroll-runs/${id}/items/${employeeId}/hold`, { hold, reason: reason || undefined }, auth);
}

/** Holds or releases many salaries of one payroll; `skipped` says who was left as is and why. */
export function holdMany(id: number, employeeIds: number[], hold: boolean, reason?: string) {
  return apiClient.post<{ changed: number[]; skipped: { employeeId: number; reason: string }[]; run: RunDto }>(`/payroll-runs/${id}/hold`, { employee_ids: employeeIds, hold, reason: reason || undefined }, auth);
}

/** `holdErrors`: employees whose pay could not be calculated are put on hold (not paid) and the rest is finalized. */
export function finalize(id: number, holdErrors = false, employeeIds?: number[]) {
  const body: Record<string, unknown> = {};
  if (holdErrors) body.hold_errors = true;
  // Only these employees: everyone else moves to a new draft batch of the same company and period.
  if (employeeIds) body.employee_ids = employeeIds;
  return apiClient.post<RunDto>(`/payroll-runs/${id}/finalize`, body, auth);
}

export function reopen(id: number, reason: string) {
  return apiClient.post<RunDto>(`/payroll-runs/${id}/reopen`, { reason }, auth);
}

/** `employeeIds`: pay only these salaries (the payroll is paid once nothing payable is left). */
export function markPaid(id: number, paidOn: string, reference?: string, employeeIds?: number[]) {
  return apiClient.post<RunDto>(`/payroll-runs/${id}/mark-paid`, { paid_on: paidOn, reference: reference || undefined, employee_ids: employeeIds }, auth);
}

export function generatePayslips(id: number, employeeIds?: number[]) {
  return apiClient.post<{ generated: number; run: RunDto }>(`/payroll-runs/${id}/generate`, employeeIds ? { employee_ids: employeeIds } : {}, auth);
}

export function release(id: number) {
  return apiClient.post<{ generated: number; run: RunDto }>(`/payroll-runs/${id}/generate`, {}, auth).then((r) => r.run);
}

export function getSettings(subOrgId: number | null) {
  return apiClient.get<PayrollSettingsDto>('/payroll-runs/settings', { subOrgId: subOrgId ?? undefined }, auth);
}

export function saveSettings(subOrgId: number | null, patch: PayrollSettingsPatchDto) {
  return apiClient.put<PayrollSettingsDto>('/payroll-runs/settings', { sub_organization_id: subOrgId, ...patch }, auth);
}

export function exportPayslips(runId: number, layout: 'zip' | 'combined', employeeIds?: number[], includeHeld?: boolean) {
  return apiClient.post<ExportJobDto>('/exports/payslips', { runId, layout, employeeIds, includeHeld }, auth);
}

export function exportRegister(runId: number, separateWeekOff = false, layout: 'full' | 'summary' = 'full') {
  return apiClient.post<ExportJobDto>('/exports/payroll-register', { runId, separateWeekOff, layout }, auth);
}

/** Days each employee checked in, never checked out, and lost pay for (as the run counted them). */
export function exportMissedCheckoutLop(runId: number) {
  return apiClient.post<ExportJobDto>('/exports/payroll-missed-checkout-lop', { runId }, auth);
}

export function exportBankTransfer(runId: number) {
  return apiClient.post<ExportJobDto>('/exports/payroll-bank-transfer', { runId }, auth);
}

// ---- Payable-day adjustments: +/- day corrections per employee and pay period (a ledger; nothing is locked). ----

export interface DayAdjustmentDto {
  id: number; employee_id: number; period_start: string; period_end: string; kind?: 'days' | 'amount'; days: number; amount?: number | null; reason: string; status: 'active' | 'cancelled';
  created_by: string | null; created_at: string; cancelled_by: string | null; cancelled_at: string | null; cancel_reason: string | null;
}
export interface AdjustablePeriodDto {
  period_start: string; period_end: string; month_key: string; status: 'draft' | 'finalized' | 'paid'; pending_action: string | null; computing: boolean;
  payable_days: number | null; period_days: number | null; attendance_payable_days: number | null;
  /** The policy's payable-day cap for the period; null = no cap (days may go past the period). */
  payable_cap?: number | null;
}
export interface DayAdjustmentListDto { employee: { id: number; code: string | null; name: string }; periods: AdjustablePeriodDto[]; adjustments: DayAdjustmentDto[] }
export interface DayAdjustmentResultDto { adjustment: DayAdjustmentDto; effect: 'recalculated' | 'arrears' | 'next_payroll'; month_key: string | null; message: string }

export function listDayAdjustments(employeeId: number) {
  return apiClient.get<DayAdjustmentListDto>('/payroll-runs/day-adjustments', { employee_id: employeeId }, auth);
}
export function addDayAdjustment(body: { employee_id: number; period_start: string; period_end: string; reason: string; kind?: 'days' | 'amount'; days?: number; amount?: number }) {
  return apiClient.post<DayAdjustmentResultDto>('/payroll-runs/day-adjustments', body, auth);
}
export function cancelDayAdjustment(id: number, reason: string) {
  return apiClient.post<DayAdjustmentResultDto>(`/payroll-runs/day-adjustments/${id}/cancel`, { reason }, auth);
}

export interface LineEditDto { key: string; amount: number; steps?: Array<{ step: string; value: string }> }
export function saveLineOverrides(body: { run_id: number; employee_id: number; edits: LineEditDto[] }) {
  return apiClient.put<{ ok: boolean; message: string }>('/payroll-runs/line-overrides', body, auth);
}
export function resetLineOverrides(body: { run_id: number; employee_id: number; keys?: string[] }) {
  return apiClient.post<{ ok: boolean; removed: number; message: string }>('/payroll-runs/line-overrides/reset', body, auth);
}

export interface LineTypeDto { id: number; name: string }
/** Earning components and deduction rules a line can be added from, for this payroll's company. */
export function lineTypes(runId: number) {
  return apiClient.get<{ earnings: LineTypeDto[]; deductions: LineTypeDto[] }>('/payroll-runs/line-overrides/types', { run_id: runId }, auth);
}
export function addLine(body: { run_id: number; employee_id: number; kind: 'earning' | 'deduction'; type_id: number; amount: number }) {
  return apiClient.post<{ ok: boolean; message: string }>('/payroll-runs/line-overrides/lines', body, auth);
}

/**
 * A new type in payroll settings, made from the payslip edit: an earning component (fixed amount, taxable) or a custom
 * deduction rule (fixed ₹0, not assigned to anyone), so it only shows where a line of it is added. Needs the
 * salary-components / deduction-rules add permission.
 */
export async function createLineType(kind: 'earning' | 'deduction', name: string, subOrganizationId: number | null): Promise<number> {
  if (kind === 'earning') {
    const r = await apiClient.post<{ component: { id: number } }>('/payroll/components', {
      component_name: name, component_type: 'credit', calculation_type: 'flat', tax_treatment: 'taxable', status: 'active', sub_organization_id: subOrganizationId,
    }, auth);
    return Number(r.component.id);
  }
  const r = await apiClient.post<{ id: number }>('/payroll/debits', {
    debit_name: name, category: 'custom', debit_type: 'fixed', fixed_amount: 0, frequency: 'monthly', status: 'active', sub_organization_id: subOrganizationId,
  }, auth);
  return Number(r.id);
}
