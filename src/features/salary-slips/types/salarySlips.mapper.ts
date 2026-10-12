import type { PayRunDto, RunItemDto, RunItemPageDto } from './salarySlips.dto';
import type { PayRun, RunPayslipSummary, SalarySlipPage, SalarySlipRow, SlipStatus } from './salarySlips.model';

export function toPayRun(dto: PayRunDto & { id: number }): PayRun {
  const status = dto.status === 'paid' ? 'paid' : dto.status === 'finalized' ? 'finalized' : 'draft';
  return {
    id: dto.id,
    companyName: dto.company_name || 'Organization',
    periodLabel: dto.period_label,
    payDate: dto.pay_date,
    status,
    releaseMode: dto.release_mode === 'manual' ? 'manual' : 'after_pay_day',
    releaseOn: dto.release_on,
    releasedAt: dto.released_at,
    employees: Number(dto.totals?.employees) || 0,
    isReleased: Boolean(dto.released_at),
    pendingAction: dto.pending_action ?? null,
  };
}

export function toPayRuns(runs: PayRunDto[]): PayRun[] {
  return runs
    .filter((r): r is PayRunDto & { id: number } => r.id !== null && r.status !== 'not_started')
    .map(toPayRun);
}

export function toRunPayslipSummary(dto: PayRunDto): RunPayslipSummary {
  const c = dto.payslip_counts;
  const held = dto.status_counts?.held;
  return {
    counts: c ? { generated: Number(c.generated) || 0, notGenerated: Number(c.not_generated) || 0, held: Number(c.held) || 0 } : null,
    held: held === undefined || held === null ? null : Number(held) || 0,
  };
}

function slipStatus(item: RunItemDto, run: PayRun): SlipStatus {
  const state = item.payslip_state;
  if (item.status === 'held') return 'held';
  if (state === 'draft' ||state === 'not_generated' || state === 'visible' || state === 'held') return state;
  if (run.status === 'draft') return 'draft';
  return run.isReleased || item.published_at ? 'visible' : 'not_generated';
}

export function toSlipRow(item: RunItemDto, run: PayRun): SalarySlipRow {
  return {
    employeeId: item.employee.id,
    name: item.employee.name,
    code: item.employee.code,
    site: item.site,
    payslipNumber: item.payslip_number,
    netPay: Number(item.net_pay) || 0,
    status: slipStatus(item, run),
    holdReason: item.hold_reason,
    publishedAt: item.published_at ?? null,
  };
}

export function toSlipPage(dto: RunItemPageDto, run: PayRun): SalarySlipPage {
  return {
    rows: dto.items.map((i) => toSlipRow(i, run)),
    total: Number(dto.total) || 0,
    page: Number(dto.page) || 1,
    pageSize: Number(dto.page_size) || 25,
  };
}
