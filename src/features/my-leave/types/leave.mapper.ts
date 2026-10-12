import type { ApplicationDto, OverviewDto, QuoteDto, RequestDetailDto, RequestsPageDto, TimelineDto } from './leave.dto';
import type { LeaveRequest, LeaveRequestDetail, LeaveStatus, Overview, Quote, RequestsPage, Session, Timeline } from './leave.model';

const STATUSES: readonly string[] = ['pending', 'approved', 'rejected', 'cancelled', 'expired'];
const SESSIONS: readonly string[] = ['full', 'first_half', 'second_half'];
const statusOf = (s: string): LeaveStatus => (STATUSES.includes(String(s).toLowerCase()) ? (String(s).toLowerCase() as LeaveStatus) : 'pending');
const sessionOf = (s: string): Session => (SESSIONS.includes(s) ? (s as Session) : 'full');
const n = (v: unknown) => Number(v) || 0;

export function toOverview(dto: OverviewDto): Overview {
  return {
    today: dto.today,
    pending: n(dto.requests?.pending),
    types: dto.types.map((t) => ({
      id: t.leave_type_id, code: t.code, name: t.name, color: t.color, isPaid: t.is_paid, mode: t.mode, locked: t.locked, policy: t.policy,
      balance: t.balance ? {
        cycle: t.balance.cycle ? { start: t.balance.cycle.start, end: t.balance.cycle.end } : null,
        available: n(t.balance.available), used: n(t.balance.used), pending: n(t.balance.pending), credited: n(t.balance.credited) + n(t.balance.opening),
        carriedIn: n(t.balance.carried_in), lapsed: n(t.balance.lapsed), adjusted: n(t.balance.adjusted), encashed: n(t.balance.encashed),
        expiringLots: t.balance.expiring_lots ?? [],
        creditScope: t.balance.credit_view?.scope ?? 'year',
        creditedInScope: t.balance.credit_view ? n(t.balance.credit_view.credited) : n(t.balance.credited) + n(t.balance.opening) + n(t.balance.adjusted),
        broughtForward: t.balance.credit_view?.brought_forward ?? (n(t.balance.carried_in) > 0 ? n(t.balance.carried_in) : null),
        usedSources: (t.balance.used_breakdown ?? []).map((x) => ({ kind: x.kind, ref: x.ref, date: x.date, quantity: n(x.quantity) })),
        pendingSources: (t.balance.pending_breakdown ?? []).map((x) => ({ kind: x.kind, ref: x.ref, date: x.date, quantity: n(x.quantity) })),
        absenceAdjust: t.balance.absence_adjust ? { quantity: n(t.balance.absence_adjust.pending_quantity), items: t.balance.absence_adjust.items.map((i) => ({ date: i.date, quantity: n(i.quantity) })) } : null,
      } : null,
    })),
    earned: dto.earned.map((g) => ({
      id: g.id, date: g.date, reason: g.reason, kind: g.kind, units: n(g.units), minutes: g.minutes, state: g.state, expiresOn: g.expires_on, canChoose: g.can_choose,
    })),
  };
}

export function toRequest(a: ApplicationDto): LeaveRequest {
  return {
    id: a.id,
    type: { id: a.leave_type.id, name: a.leave_type.name, color: a.leave_type.color },
    startDate: a.start_date, endDate: a.end_date, startSession: sessionOf(a.start_session), endSession: sessionOf(a.end_session),
    unit: a.unit === 'hour' ? 'hour' : 'day', hours: a.hours, days: n(a.charged_days), lopDays: n(a.lop_days), status: statusOf(a.status),
    reason: a.reason, rejectionReason: a.rejection_reason, cancelReason: a.cancel_reason, attachmentUrl: a.attachment_url,
    createdAt: a.created_at, addedByHr: a.added_by !== null && a.added_by !== undefined,
  };
}

export function toRequestsPage(dto: RequestsPageDto): RequestsPage {
  const counts: RequestsPage['counts'] = {};
  for (const [k, v] of Object.entries(dto.counts ?? {})) if (STATUSES.includes(k)) counts[k as LeaveStatus] = v;
  return { rows: dto.requests.map(toRequest), counts, total: dto.total, pages: Math.max(1, dto.pages) };
}

export function toDetail(dto: RequestDetailDto): LeaveRequestDetail {
  return {
    ...toRequest(dto),
    dayList: (dto.days ?? []).map((d) => ({ date: d.date, slot: d.slot, kind: d.kind, charged: n(d.charged), isLop: d.is_lop })),
    impact: (dto.balance_impact ?? []).filter((i) => i.held || i.used).map((i) => ({ name: i.name, held: n(i.held), used: n(i.used) })),
    approvalId: dto.approval_id ?? null,
  };
}

export function toQuote(dto: QuoteDto): Quote {
  return {
    ok: dto.ok,
    violations: dto.violations.map((v) => ({ field: v.field, key: v.key ?? v.code, params: v.params ?? {}, message: v.message })),
    days: n(dto.charged_days), lopDays: n(dto.lop_days), balance: dto.balance, hasBalance: dto.has_balance,
    allocations: dto.allocations.map((a) => ({ typeId: a.leave_type_id, quantity: n(a.quantity), isLop: a.is_lop })),
    skipped: dto.skipped.map((s) => ({ date: s.date, kind: s.kind })),
  };
}

export function toTimeline(dto: TimelineDto): Timeline {
  return {
    entries: dto.entries.map((e) => ({ kind: e.kind, at: e.at, actor: e.actor, step: e.step, note: e.note })),
    waiting: dto.waiting ? { step: dto.waiting.step, approvers: dto.waiting.approvers, openToRole: dto.waiting.open_to_role, since: dto.waiting.since } : null,
  };
}
