import type { CompOffGrantDto, DayDetailDto, DayRecordDto, EmployeeHeaderDto, ImpactDto, ListResponseDto, MonthResponseDto } from './detailed.dto';
import type { AttendanceList, CompOffGrant, DayDetail, DayRecord, EmployeeHeader, Impact, Month } from './detailed.model';

const header = (e: EmployeeHeaderDto): EmployeeHeader => ({
  id: e.id, code: e.code, name: e.name, department: e.department, role: e.role, status: e.status, joiningDate: e.joining_date, exitDate: e.exit_date,
});

export function toList(dto: ListResponseDto): AttendanceList {
  return {
    date: dto.date,
    today: dto.today,
    timezone: dto.timezone,
    total: dto.total,
    rows: dto.employees.map((e) => ({
      employeeId: e.employee_id,
      code: e.employee_code,
      name: e.name,
      department: e.department,
      role: e.role,
      badge: e.day.badge,
      inAt: e.day.in_at,
      outAt: e.day.out_at,
      workedMinutes: e.day.worked_minutes,
      site: e.day.site,
      offSite: e.day.off_site,
      locked: e.day.locked,
      nightOtYesterdayMinutes: e.night_ot_yesterday_minutes,
      month: { payableDays: e.month.payable_days, present: e.month.present, halfDays: e.month.half_days, absent: e.month.absent, leaveDays: e.month.leave_days, lateMarks: e.month.late_marks },
    })),
  };
}

export const toCompOffGrant = (g: CompOffGrantDto): CompOffGrant => ({
  id: g.id || 0,
  dayId: g.day_id || null,
  workDate: g.work_date,
  grantKey: g.grant_key,
  reason: g.reason,
  category: g.category || null,
  units: g.units,
  minutes: g.minutes,
  kind: g.kind,
  state: g.state,
  expiresOn: g.expires_on || null,
  description: g.description || '',
  details: g.details ? {
    workDate: g.details.work_date,
    reason: g.details.reason,
    category: g.details.category || null,
    workedFrom: g.details.worked_from || null,
    workedTo: g.details.worked_to || null,
    durationText: g.details.duration_text || null,
    holidayName: g.details.holiday_name || null,
  } : undefined,
  approval: g.approval ? {
    requestId: g.approval.request_id,
    status: g.approval.status,
    currentStep: g.approval.current_step,
    currentStepName: g.approval.current_step_name || null,
    createdAt: g.approval.created_at || null,
    decidedAt: g.approval.decided_at || null,
    steps: (g.approval.steps || []).map((s) => ({
      index: s.index,
      name: s.name,
      status: s.status,
      assignee: s.assignee ? { id: s.assignee.id, name: s.assignee.name, code: s.assignee.code || null } : null,
      actedAt: s.acted_at || null,
      note: s.note || null,
    })),
    events: (g.approval.events || []).map((ev) => ({
      id: ev.id,
      step: ev.step,
      action: ev.action,
      actor: ev.actor || null,
      note: ev.note || null,
      at: ev.at || '',
    })),
  } : null,
});

export function toMonth(dto: MonthResponseDto): Month {
  const s = dto.summary;
  return {
    employee: header(dto.employee),
    month: dto.month,
    timezone: dto.timezone,
    from: dto.from,
    to: dto.to,
    today: dto.today,
    policy: {
      resolved: dto.policy?.resolved ?? false,
      lateDeduction: dto.policy?.late_deduction ?? false,
      sandwich: dto.policy?.sandwich ?? false,
    },
    cells: (dto.cells || []).map((c) => ({
      date: c.date,
      day: Number(c.date?.slice(8) || 1),
      weekday: c.weekday,
      badge: c.badge,
      inAt: c.in_at,
      outAt: c.out_at,
      workedMinutes: c.worked_minutes,
      payableUnits: c.payable_units,
      lateMinutes: c.late_minutes,
      overtimeMinutes: c.overtime_minutes,
      leave: c.leave ? { code: c.leave.code, name: c.leave.name, units: c.leave.units, isPaid: c.leave.is_paid, session: c.leave.session ?? null } : null,
      regularizationStatus: c.regularization_status ?? null,
    })),
    summary: {
      calendarDays: s.calendar_days ?? s.total_days ?? 0,
      totalDays: s.total_days ?? s.calendar_days ?? 0,
      cycleDays: s.cycle_days ?? s.total_days ?? s.calendar_days ?? 0,
      employedDays: s.employed_days ?? s.calendar_days ?? 0,
      notJoined: s.not_joined ?? false,
      joinedMidCycle: s.joined_mid_cycle ?? false,
      basis: s.basis ?? 'calendar_days',
      payableDays: s.payable_days ?? 0,
      payableDaysBeforeLateDeduction: s.payable_days_before_late_deduction ?? 0,
      lopDays: s.lop_days ?? 0,
      lop: {
        absent: s.lop?.absent ?? 0,
        halfDay: s.lop?.half_day ?? 0,
        other: s.lop?.other ?? 0,
        unpaidLeave: s.lop?.unpaid_leave ?? 0,
        sandwich: s.lop?.sandwich ?? 0,
        lateDeduction: s.lop?.late_deduction ?? 0,
      },
      present: s.present ?? 0,
      halfDays: s.half_days ?? 0,
      absent: s.absent ?? 0,
      leaveDays: s.leave_days ?? 0,
      paidLeaveDays: s.paid_leave_days ?? 0,
      unpaidLeaveDays: s.unpaid_leave_days ?? 0,
      holidays: s.holidays ?? 0,
      weekOffs: s.week_offs ?? 0,
      late: s.late ?? { marks: 0, minutes: 0, hours: 0 },
      early: { marks: s.early?.marks ?? 0, exitMinutes: s.early?.exit_minutes ?? 0 },
      overtime: s.overtime ?? { minutes: 0, hours: 0 },
      nightOt: s.night_ot ?? { minutes: 0, hours: 0 },
      worked: s.worked ?? { minutes: 0, hours: 0 },
      lateDeduction: {
        enabled: s.late_deduction?.enabled ?? false,
        minutes: s.late_deduction?.minutes ?? 0,
        chargeableMinutes: s.late_deduction?.chargeable_minutes ?? 0,
        freeMinutes: s.late_deduction?.free_minutes ?? 0,
        days: s.late_deduction?.days ?? 0,
      },
      consecutiveAbsence: s.consecutive_absence ?? null,
    },
    balances: (dto.balances || []).map((b) => ({
      code: b.code, name: b.name, kind: b.kind, color: b.color, isPaid: b.is_paid, available: b.available, used: b.used, pending: b.pending, credited: b.credited, period: b.period,
      earned: b.earned ? { units: b.earned.units, pendingUnits: b.earned.pending_units, paidMinutes: b.earned.paid_minutes } : null,
      grants: b.grants ? (b.grants || []).map(toCompOffGrant) : undefined,
    })),
    compOffGrants: dto.comp_off_grants ? (dto.comp_off_grants || []).map(toCompOffGrant) : undefined,
  };
}

export function toDayRecord(d: DayRecordDto): DayRecord {
  return {
    status: d.status,
    payableUnits: d.payable_units,
    dayType: d.day_type,
    shiftStartAt: d.shift_start_at,
    shiftEndAt: d.shift_end_at,
    firstInAt: d.first_in_at,
    lastOutAt: d.last_out_at,
    openSession: d.open_session,
    expectedMinutes: d.expected_minutes,
    workedMinutes: d.worked_minutes,
    breakMinutes: d.break_minutes,
    lateMinutes: d.late_minutes,
    lateBeyondGraceMinutes: d.late_beyond_grace_minutes,
    lateExcusedMinutes: d.late_excused_minutes,
    earlyMinutes: d.early_minutes,
    earlyExitMinutes: d.early_exit_minutes,
    overtimeMinutes: d.overtime_minutes,
    nightOtMinutes: d.night_ot_minutes,
    lateMark: d.late_mark,
    earlyMark: d.early_mark,
    latePenalty: d.late_penalty,
    earlyPenalty: d.early_penalty,
    lateMarkNumber: d.late_mark_number,
    earlyMarkNumber: d.early_mark_number,
    flags: d.flags,
    reviewState: d.review_state,
    overridden: d.overridden,
    locked: d.locked,
  };
}

export function toDay(dto: DayDetailDto): DayDetail {
  return {
    employee: header(dto.employee),
    date: dto.date,
    today: dto.today,
    timezone: dto.timezone,
    badge: dto.badge,
    day: dto.day ? toDayRecord(dto.day) : null,
    schedule: dto.schedule
      ? { kind: dto.schedule.kind, roster: dto.schedule.roster, flexible: dto.schedule.flexible, shift: dto.schedule.shift ? { start: dto.schedule.shift.start, end: dto.schedule.shift.end, endsNextDay: dto.schedule.shift.ends_next_day, breakMinutes: dto.schedule.shift.break_minutes, expectedMinutes: dto.schedule.shift.expected_minutes } : null }
      : null,
    form: { inTime: dto.form.in_time, outTime: dto.form.out_time, from: dto.form.from, forcedStatus: dto.form.forced_status },
    holiday: dto.holiday,
    leave: dto.leave ? { code: dto.leave.code, name: dto.leave.name, units: dto.leave.units, isPaid: dto.leave.is_paid, session: dto.leave.session ?? null } : null,
    nightOtYesterdayMinutes: dto.night_ot_yesterday_minutes,
    override: dto.override ? { status: dto.override.status, units: dto.override.units, reason: dto.override.reason, by: dto.override.by, at: dto.override.at, inTime: dto.override.in_time, outTime: dto.override.out_time } : null,
    punches: dto.punches.map((p) => ({ id: p.id, direction: p.direction, kind: p.kind, at: p.at, source: p.source, place: p.place, location: p.location, distanceM: p.distance_m, lat: p.lat, lng: p.lng, accuracyM: p.accuracy_m, hasImage: p.has_image, face: p.face, voided: p.voided, voidReason: p.void_reason })),
    breaks: dto.breaks.map((b) => ({ id: b.id, startedAt: b.started_at, endedAt: b.ended_at })),
    compOff: (dto.comp_off || []).map(toCompOffGrant),
    history: dto.history,
    canOverride: dto.can_override,
    locked: dto.locked,
    regularization: dto.regularization ? { id: dto.regularization.id, status: dto.regularization.status, kinds: dto.regularization.kinds, submittedAt: dto.regularization.submitted_at } : null,
  };
}

export function toImpact(dto: ImpactDto): Impact {
  return {
    status: dto.status,
    payableUnits: dto.payable_units,
    late: dto.late,
    early: dto.early,
    overtimeMinutes: dto.overtime_minutes,
    nightOtMinutes: dto.night_ot_minutes,
    compOff: dto.compoff.map((c) => ({ key: c.key, reason: c.reason, kind: c.kind, action: c.action, unitsFrom: c.units_from, unitsTo: c.units_to, minutes: c.minutes, needsApproval: c.needs_approval })),
    leaveBalanceReturned: dto.leave.balance_returned,
    leaveFraction: dto.leave.fraction,
    otherDays: dto.other_days.map((o) => ({ date: o.date, status: o.status, payableUnits: o.payable_units })),
    changed: dto.changed,
  };
}
