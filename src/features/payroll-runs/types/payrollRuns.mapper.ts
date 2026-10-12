import { PAYOUT_CATEGORY_LABEL, STATUTORY_CATEGORIES } from '../constants/payrollRuns.constants';
import type {
  AttendanceDto,
  ItemDetailResponseDto,
  ItemDto,
  ItemListResponseDto,
  LateDeductionDto,
  LineDto,
  LopBreakdownDto,
  RunDto,
} from './payrollRuns.dto';
import type { Attendance, EmployeePay, ItemPage, LateDeduction, LopBreakdown, PayItem, PayLine, Run } from './payrollRuns.model';

const n = (v: unknown) => (v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v));
const nOrNull = (v: unknown) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

export function toRun(dto: RunDto): Run {
  const t = dto.totals || {};
  return {
    key: dto.id !== null ? `run-${dto.id}` : `plan-${dto.sub_organization_id ?? 'org'}-${dto.period_start}`,
    id: dto.id,
    subOrganizationId: dto.sub_organization_id ?? null,
    companyName: dto.company_name || 'Organization',
    frequency: dto.frequency,
    periodStart: dto.period_start,
    periodEnd: dto.period_end,
    periodLabel: dto.period_label,
    month: dto.month,
    payDate: dto.pay_date ?? null,
    releaseMode: dto.release_mode ?? null,
    releaseOn: dto.release_on ?? null,
    status: dto.status,
    stage: dto.stage,
    pendingAction: dto.pending_action ?? null,
    pendingNote: dto.pending_note ?? null,
    compute: {
      state: dto.compute?.state ?? 'idle',
      error: dto.compute?.error ?? null,
      done: n(dto.compute?.done),
      total: n(dto.compute?.total),
    },
    computedAt: dto.computed_at ?? null,
    totals: {
      employees: n(t.employees),
      held: n(t.held),
      warnings: n(t.warnings),
      errors: n(t.errors),
      gross: nOrNull(t.gross),
      deductions: nOrNull(t.deductions),
      employer: nOrNull(t.employer),
      net: nOrNull(t.net),
    },
    finalizedAt: dto.finalized_at ?? null,
    releasedAt: dto.released_at ?? null,
    paidOn: dto.paid_on ?? null,
    paidReference: dto.paid_reference ?? null,
    source: dto.source ?? null,
    statusCounts: dto.status_counts
      ? { ok: n(dto.status_counts.ok), warning: n(dto.status_counts.warning), error: n(dto.status_counts.error), held: n(dto.status_counts.held) }
      : null,
    finalizeNeedsApproval: typeof dto.finalize_needs_approval === 'boolean' ? dto.finalize_needs_approval : null,
  };
}

function toLopBreakdown(lop: LopBreakdownDto): LopBreakdown {
  return {
    absent: n(lop.absent),
    halfDay: n(lop.half_day),
    other: n(lop.other),
    unpaidLeave: n(lop.unpaid_leave),
    sandwich: n(lop.sandwich),
    lateDeduction: n(lop.late_deduction),
  };
}

function toLateDeduction(dto: LateDeductionDto | null | undefined): LateDeduction | null {
  if (!dto) return null;
  return {
    days: n(dto.days),
    minutes: n(dto.minutes),
    chargeableMinutes: n(dto.chargeable_minutes),
    freeMinutes: n(dto.free_minutes),
    amount: n(dto.amount),
  };
}

export function toItem(dto: ItemDto): PayItem {
  return {
    id: dto.id,
    runId: dto.run_id,
    employee: { id: dto.employee.id, code: dto.employee.code || null, name: dto.employee.name || '—' },
    site: dto.site,
    department: dto.department,
    isPrimaryCompany: Boolean(dto.is_primary_company),
    status: dto.status,
    holdReason: dto.hold_reason,
    cycleDays: n(dto.cycle_days),
    payableDays: n(dto.payable_days),
    lopDays: n(dto.lop_days),
    lopBreakdown: dto.lop_breakdown ? toLopBreakdown(dto.lop_breakdown) : null,
    lateDeduction: toLateDeduction(dto.late_deduction),
    leaveDays: n(dto.leave_days),
    monthlyGross: nOrNull(dto.monthly_gross),
    earnings: n(dto.earnings),
    deductions: n(dto.deductions),
    employer: n(dto.employer),
    netPay: n(dto.net_pay),
    warnings: Array.isArray(dto.warnings) ? dto.warnings : [],
    payslipNumber: dto.payslip_number,
    payslipState: dto.payslip_state ?? null,
    publishedAt: dto.published_at ?? null,
  };
}

export function toItemPage(dto: ItemListResponseDto): ItemPage {
  const pageSize = dto.page_size || 25;
  return {
    page: dto.page,
    pageSize,
    total: dto.total,
    totalPages: Math.max(1, Math.ceil(dto.total / pageSize)),
    items: (dto.items || []).map(toItem),
  };
}

function lineBadge(line: LineDto): string | null {
  const type = line.source?.type;
  const category = (line.category || '').toLowerCase();
  if (type === 'grant') return 'Overtime';
  if (type === 'payout') return PAYOUT_CATEGORY_LABEL[category] || 'Payout';
  if (type === 'advance') return 'Advance';
  if (type === 'rounding') return 'Rounding';
  if (type === 'legacy') return 'Imported';
  if (type === 'rule') return STATUTORY_CATEGORIES.has(category) ? 'Statutory' : null;
  return null;
}

function stepValue(v: number | string | null) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('en-IN') : v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return String(v).replace(/_/g, ' ');
}

export function toLine(dto: LineDto): PayLine {
  const steps = (dto.steps || []).map((s) => ({ step: s.step, value: stepValue(s.value) }));
  const full = nOrNull(dto.full_amount);
  if (!steps.length && full !== null && dto.source?.type === 'component') {
    steps.push({ step: 'Monthly amount', value: stepValue(full) });
    if (full !== n(dto.amount)) steps.push({ step: 'Paid for payable days', value: stepValue(n(dto.amount)) });
  }
  return {
    key: dto.key,
    label: dto.label,
    amount: n(dto.amount),
    fullAmount: full,
    category: dto.category ?? null,
    source: dto.source?.type ?? null,
    badge: lineBadge(dto),
    steps,
  };
}

function toAttendance(dto: AttendanceDto | null): Attendance | null {
  if (!dto) return null;
  const leaveType = (t: { code: string | null; name: string | null; is_paid: boolean; days: number; covered_absence_days?: number }) => ({
    code: t.code,
    name: t.name || t.code || 'Leave',
    isPaid: t.is_paid !== false,
    days: n(t.days),
    coveredAbsenceDays: n(t.covered_absence_days),
  });
  return {
    leaveByType: (dto.leave_by_type || []).map(leaveType),
    sandwichLeave: { days: n(dto.leave_sandwich?.days), byType: (dto.leave_sandwich?.by_type || []).map(leaveType) },
    cycleDays: n(dto.cycle_days),
    payableDays: n(dto.payable_days),
    lopDays: n(dto.lop_days),
    lop: toLopBreakdown(dto.lop || {}),
    present: n(dto.present),
    halfDays: n(dto.half_days),
    absent: n(dto.absent),
    leaveDays: n(dto.leave_days),
    paidLeaveDays: n(dto.paid_leave_days),
    unpaidLeaveDays: n(dto.unpaid_leave_days),
    holidays: n(dto.holidays),
    weekOffs: n(dto.week_offs),
    overtimeHours: n(dto.overtime?.hours) + n(dto.night_ot?.hours),
    lateMarks: n(dto.late?.marks),
    joinedMidCycle: Boolean(dto.joined_mid_cycle),
    notJoined: Boolean(dto.not_joined),
    cells: (dto.cells || []).map((c) => ({
      date: c.date,
      key: c.key || 'unknown',
      label: c.label || '—',
      tone: c.tone || 'muted',
      payableUnits: nOrNull(c.payable_units),
      leave: typeof c.leave === 'string' ? c.leave : c.leave?.code ?? null,
      leaveName: typeof c.leave === 'string' ? c.leave : c.leave?.name ?? c.leave?.code ?? null,
      lateMinutes: n(c.late_minutes),
      overtimeMinutes: n(c.overtime_minutes),
    })),
  };
}

export function toEmployeePay(dto: ItemDetailResponseDto): EmployeePay {
  const item = dto.item;
  return {
    run: toRun(dto.run),
    item: {
      ...toItem(item),
      revisionId: nOrNull(item.revision_id),
      earningLines: (item.earnings_lines || []).map(toLine),
      deductionLines: (item.deduction_lines || []).map(toLine),
      employerLines: (item.employer_lines || []).map(toLine),
      attendance: toAttendance(item.attendance),
      segments: (item.inputs?.segments || []).map((s) => ({
        revisionId: nOrNull(s.revision_id),
        from: s.from,
        to: s.to,
        gross: n(s.gross),
        weight: n(s.weight),
      })),
      hasLegacyPayslip: Boolean(item.has_legacy_payslip),
    },
    otherCompanies: (dto.other_companies || []).map((c) => ({
      runId: c.run_id,
      companyName: c.company_name || 'Organization',
      status: c.status,
      netPay: nOrNull(c.net_pay),
      isPrimaryCompany: Boolean(c.is_primary_company),
    })),
  };
}
