import type {
  AdvanceDetailDto,
  AdvanceDto,
  AdvanceListItemDto,
  AdvanceTypeDto,
  AdvanceTypeListResponseDto,
  AdvanceTypeRequestDto,
  CreateHrAdvanceRequestDto,
  CreateMyAdvanceRequestDto,
  EligibilityDto,
  InstallmentDto,
  MergeableAdvanceDto,
  MyOverviewDto,
  PlanContextDto,
  PlanPreviewDto,
  PlanRequestDto,
  NamedRefDto,
  OverviewDto,
  PreviewResponseDto,
} from './salaryAdvance.dto';
import type {
  Advance,
  AdvanceDetail,
  AdvanceType,
  AdvanceTypeFormInput,
  Eligibility,
  HrAdvanceFormInput,
  Installment,
  InterestMode,
  MergeableAdvance,
  PlanContext,
  PlanInput,
  PlanPreview,
  MyAdvanceFormInput,
  MyOverview,
  Overview,
  SchedulePreview,
} from './salaryAdvance.model';

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nameOf(ref: NamedRefDto | undefined): string | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.name || null;
}

export function toAdvance(dto: AdvanceDto | AdvanceListItemDto): Advance {
  const approved = numOrNull(dto.approved_amount);
  const total = num(dto.total_repayable);
  const recovered = num(dto.recovered);
  const outstanding = num(dto.outstanding);
  const base = total > 0 ? total : recovered + outstanding;
  const list = dto as Partial<AdvanceListItemDto>;
  return {
    id: dto.id,
    employeeId: dto.employee?.id ?? 0,
    employeeName: dto.employee?.name || '—',
    employeeCode: dto.employee?.code ?? null,
    typeId: dto.type?.id ?? 0,
    typeName: dto.type?.name || 'Advance',
    typeCode: dto.type?.code || '',
    kind: dto.type?.kind || 'advance',
    status: dto.status,
    requestedAmount: num(dto.requested_amount),
    approvedAmount: approved,
    amount: approved ?? num(dto.requested_amount),
    installments: num(dto.installments),
    installmentAmount: num(dto.installment_amount),
    interestMode: dto.interest_mode || 'none',
    interestRate: num(dto.interest_rate),
    interestAmount: num(dto.interest_amount),
    totalRepayable: total,
    startMonth: dto.start_month,
    disbursementMode: dto.disbursement_mode,
    plan: {
      installments: num(dto.plan?.installments ?? dto.installments),
      startMonth: dto.plan?.start_month ?? null,
      mergeAdvanceIds: dto.plan?.merge_advance_ids ?? [],
    },
    mergedIntoId: dto.merged_into_id ?? null,
    mergedFrom: (dto.merged_from || []).map((m) => ({ advanceId: m.advance_id, outstanding: num(m.outstanding) })),
    recovered,
    outstanding,
    progress: base > 0 ? Math.min(100, Math.max(0, (recovered / base) * 100)) : 0,
    nextDue: dto.next_due ? { month: dto.next_due.month_key, amount: num(dto.next_due.amount) } : null,
    createdAt: dto.created_at,
    decidedAt: dto.decided_at,
    disbursedAt: dto.disbursed_at,
    closedAt: dto.closed_at,
    source: dto.source,
    site: nameOf(list.site),
    department: nameOf(list.department),
  };
}

export function toInstallment(dto: InstallmentDto): Installment {
  return {
    key: dto.id ? `i${dto.id}` : `s${dto.seq}`,
    id: dto.id,
    seq: num(dto.seq),
    month: dto.month_key,
    principal: num(dto.principal),
    interest: num(dto.interest),
    amount: num(dto.amount),
    recovered: num(dto.recovered),
    status: dto.status || 'scheduled',
    payrollItemId: dto.payroll_item_id ?? null,
    payrollRunId: dto.payroll_run_id ?? null,
    reference: dto.reference ?? null,
    note: dto.note ?? null,
  };
}

export function toAdvanceDetail(dto: AdvanceDetailDto): AdvanceDetail {
  return {
    ...toAdvance(dto),
    reason: dto.reason ?? null,
    attachments: (dto.attachments || []).map((a) => ({ index: a.index, name: a.name || `Attachment ${a.index + 1}`, size: num(a.size), type: a.type || '' })),
    disbursementReference: dto.disbursement_reference ?? null,
    hasProof: Boolean(dto.has_proof),
    schedule: (dto.schedule || []).map(toInstallment),
    events: (dto.events || []).map((e, i) => ({ key: `${e.at}-${i}`, action: e.action, at: e.at, actor: e.actor_name, data: e.data })),
    approval: dto.approval ? { requestId: dto.approval.request_id, status: dto.approval.status } : null,
    can: {
      cancel: Boolean(dto.can?.cancel),
      disburse: Boolean(dto.can?.disburse),
      adjust: Boolean(dto.can?.adjust),
      repay: Boolean(dto.can?.repay),
      waive: Boolean(dto.can?.waive),
      plan: Boolean(dto.can?.plan),
    },
    planContext: dto.plan_context ? toPlanContext(dto.plan_context) : null,
  };
}

export function toMergeable(dto: MergeableAdvanceDto): MergeableAdvance {
  return {
    id: dto.id,
    typeName: dto.type?.name || 'Advance',
    amount: num(dto.amount),
    installmentAmount: num(dto.installment_amount),
    outstanding: num(dto.outstanding),
    nextDue: dto.next_due ? { month: dto.next_due.month_key, amount: num(dto.next_due.amount) } : null,
  };
}

function toPlanPreview(dto: PlanPreviewDto): PlanPreview {
  return {
    approvedAmount: num(dto.approved_amount),
    installments: num(dto.installments),
    disbursementMode: dto.disbursement_mode,
    startMonth: dto.start_month,
    startMonthPlanned: dto.start_month_planned ?? null,
    mergeAdvanceIds: dto.merge_advance_ids || [],
    mergedOutstanding: num(dto.merged_outstanding),
    interestAmount: num(dto.interest_amount),
    totalRepayable: num(dto.total_repayable),
    installmentAmount: num(dto.installment_amount),
    monthlyDeduction: num(dto.monthly_deduction),
    schedule: (dto.schedule || []).map(toInstallment),
  };
}

export function toPlanContext(dto: PlanContextDto): PlanContext {
  return {
    currentMonth: dto.current_month,
    requestedAmount: num(dto.requested_amount),
    earliestStart: dto.earliest_start,
    maxInstallments: num(dto.max_installments) || 60,
    mergeable: (dto.mergeable || []).map(toMergeable),
    plan: toPlanPreview(dto.plan),
    errors: dto.errors || {},
  };
}

export function planInputOf(preview: PlanPreview): PlanInput {
  return {
    approvedAmount: preview.approvedAmount,
    installments: preview.installments,
    startMonth: preview.startMonthPlanned,
    disbursementMode: preview.disbursementMode,
    mergeAdvanceIds: preview.mergeAdvanceIds,
  };
}

export function toPlanBody(input: PlanInput): PlanRequestDto {
  return {
    approved_amount: input.approvedAmount,
    installments: input.installments,
    start_month: input.startMonth,
    disbursement_mode: input.disbursementMode,
    merge_advance_ids: input.mergeAdvanceIds,
  };
}

function interestOf(dto: EligibilityDto['interest']): { mode: InterestMode; rate: number } {
  if (!dto) return { mode: 'none', rate: 0 };
  if (typeof dto === 'string') return { mode: dto, rate: 0 };
  return { mode: dto.mode || 'none', rate: num(dto.annual_rate ?? dto.rate) };
}

export function toEligibility(dto: EligibilityDto): Eligibility {
  const interest = interestOf(dto.interest);
  const maxInstallments = Math.max(1, num(dto.max_installments) || 1);
  return {
    eligible: Boolean(dto.eligible),
    reasons: Array.isArray(dto.reasons) ? dto.reasons : [],
    maxAmount: numOrNull(dto.max_amount),
    minAmount: numOrNull(dto.min_amount),
    earnedSoFar: numOrNull(dto.earned_so_far),
    outstanding: numOrNull(dto.outstanding),
    maxInstallments,
    interestMode: interest.mode,
    interestRate: interest.rate,
    disbursementMode: dto.disbursement_mode || 'manual',
    hideLimits: Boolean(dto.hide_limits),
    canChooseInstallments: dto.request?.employee_can_choose_installments ?? dto.can_choose_installments ?? maxInstallments > 1,
    reasonRequired: dto.request?.reason_required ?? dto.reason_required ?? true,
    attachmentRequired: Boolean(dto.request?.attachment_required ?? dto.attachment_required),
    earliestStart: dto.request?.earliest_start ?? null,
    defaultStart: dto.request?.default_start ?? null,
    mergeable: (dto.mergeable || []).map(toMergeable),
  };
}

export function toMyOverview(dto: MyOverviewDto): MyOverview {
  return {
    enabled: dto.enabled ?? (dto.types || []).length > 0,
    types: (dto.types || []).map((t) => ({ id: t.id, code: t.code, name: t.name, kind: t.kind, eligibility: toEligibility(t.eligibility || ({} as EligibilityDto)) })),
    outstanding: num(dto.outstanding),
    active: (dto.active || []).map(toAdvance),
    pending: (dto.pending || []).map(toAdvance),
  };
}

export function toSchedulePreview(dto: PreviewResponseDto): SchedulePreview {
  const fieldErrors: Record<string, string> = dto.errors && !Array.isArray(dto.errors) ? dto.errors : {};
  const errors = !dto.errors
    ? []
    : Array.isArray(dto.errors)
      ? dto.errors
      : Object.entries(dto.errors).filter(([k]) => k !== 'amount' && k !== 'installments').map(([, v]) => v);
  return {
    schedule: (dto.schedule || []).map(toInstallment),
    totalRepayable: num(dto.total_repayable),
    interestAmount: num(dto.interest_amount),
    installmentAmount: num(dto.installment_amount),
    startMonth: dto.start_month ?? null,
    errors,
    fieldErrors,
  };
}

export function toOverview(dto: OverviewDto): Overview {
  const k = dto.kpis || ({} as OverviewDto['kpis']);
  return {
    kpis: {
      outstanding: num(k.outstanding),
      activeCount: num(k.active_count),
      pendingCount: num(k.pending_count),
      toDisburseCount: num(k.to_disburse_count),
      disbursedThisMonth: num(k.disbursed_this_month),
      recoveredThisMonth: num(k.recovered_this_month),
      carriedThisMonth: num(k.carried_this_month),
    },
    trend: (dto.trend || []).map((p) => ({ month: p.month, disbursed: num(p.disbursed), recovered: num(p.recovered) })),
    dueNextPayroll: dto.due_next_payroll
      ? { month: dto.due_next_payroll.month, amount: num(dto.due_next_payroll.amount), employees: num(dto.due_next_payroll.employees) }
      : null,
  };
}

export function toAdvanceType(dto: AdvanceTypeDto): AdvanceType {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description ?? null,
    kind: dto.kind || 'advance',
    status: dto.status || 'active',
    subOrganizationId: dto.sub_organization_id ?? null,
  };
}

export function toAdvanceTypeList(dto: AdvanceTypeListResponseDto): { types: AdvanceType[]; total: number } {
  const rows = Array.isArray(dto) ? dto : dto.types || dto.items || [];
  const total = Array.isArray(dto) ? rows.length : dto.total ?? rows.length;
  return { types: rows.map(toAdvanceType), total };
}

export function toAdvanceTypeBody(input: AdvanceTypeFormInput): AdvanceTypeRequestDto {
  return {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    description: input.description.trim() || null,
    kind: input.kind,
    status: input.status,
    sub_organization_id: input.subOrganizationId,
  };
}

export function toHrAdvanceBody(input: HrAdvanceFormInput): CreateHrAdvanceRequestDto {
  return {
    employee_id: input.employeeId as number,
    advance_type_id: input.typeId as number,
    amount: input.amount,
    installments: input.installments,
    reason: input.reason.trim(),
    disbursement_mode: input.disbursementMode ?? undefined,
    skip_approval: input.skipApproval || undefined,
    start_month: input.startMonth || undefined,
    merge_advance_ids: input.mergeAdvanceIds.length ? input.mergeAdvanceIds : undefined,
  };
}

export function toMyAdvanceBody(input: MyAdvanceFormInput): CreateMyAdvanceRequestDto {
  return {
    advance_type_id: input.typeId as number,
    amount: input.amount,
    installments: input.installments,
    start_month: input.startMonth || undefined,
    reason: input.reason.trim(),
    attachments: input.attachments.length ? input.attachments : undefined,
  };
}
