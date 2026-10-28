import { formatTime } from '@/lib/datetime';
import type { SnapshotDto } from '../types/selfDashboard.dto';

export type TodayTone = 'live' | 'good' | 'warn' | 'bad' | 'muted';

/** `fullDay` is the policy's full-day mark reached with hours still pending; only `complete` means the expected hours are done. */
export type WorkBand = 'below' | 'halfDay' | 'fullDay' | 'complete';

export interface TodayState {
  tone: TodayTone;
  headline: string;
  detail: string | null;
  /** Closed sessions plus the one running now (open sessions are not in the day's worked minutes). */
  workedMinutes: number;
  expectedMinutes: number;
  inAt: string | null;
  outAt: string | null;
  expectedEndAt: string | null;
  lateMinutes: number;
  /** How far the worked time has got against the policy's day classification: drives the ring colour. */
  band: WorkBand;
  /** The policy's half-day and full-day marks as fractions of the ring (0..1). */
  marks: number[];
  /** The day's verdict once checked out (Present, Half-Day, Absent), else null. */
  verdict: string | null;
  /** A session is running now, or nothing has been punched yet. */
  inProgress: boolean;
  onBreak: boolean;
  reviewPending: boolean;
  shiftText: string;
}

const MIN = 60000;
const OFF_LABEL: Record<string, string> = { holiday: 'Holiday', week_off: 'Week off', roster_leave: 'On leave (roster)' };
const STATUS_TONE: Record<string, TodayTone> = { Present: 'good', 'Half-Day': 'warn', Absent: 'bad' };

const at = (iso: string | null | undefined) => (iso ? Date.parse(iso) : null);

function shiftText(s: SnapshotDto, tz: string) {
  const sh = s.shift;
  if (sh?.start && sh.end) return `${formatTime(sh.start, tz)} – ${formatTime(sh.end, tz)}`;
  if (sh?.flexible_hours) return `${sh.flexible_hours}h flexible`;
  return 'No fixed shift';
}

const asMinutes = (v: unknown) => (typeof v === 'number' && v > 0 ? v : null);

export function workBand(worked: number, expected: number, half: number | null, full: number | null): WorkBand {
  if (expected > 0 && worked >= expected) return 'complete';
  if (full !== null && worked >= full) return 'fullDay';
  if (half !== null && worked >= half) return 'halfDay';
  return 'below';
}

/** What the today card says right now. Pure: the same snapshot and clock always give the same card. */
export function todayState(s: SnapshotDto, nowMs: number): TodayState {
  const tz = s.timezone;
  const day = s.day;
  const openMs = at(s.open_since);
  const live = s.rules?.live || null;
  const prog = s.progress && at(s.progress.as_of) !== null ? s.progress : null;
  let workedMinutes: number;
  let expectedMinutes: number;
  let half: number | null;
  let full: number | null;
  if (prog) {
    // Server figure (policy-correct) plus whole minutes since it was computed, only while time is really accruing.
    const asOfMs = at(prog.as_of) as number;
    const tick = openMs !== null && !s.break?.active ? Math.max(0, Math.floor((nowMs - asOfMs) / MIN)) : 0;
    workedMinutes = Math.max(0, prog.worked_minutes + tick);
    expectedMinutes = prog.expected_minutes;
    half = asMinutes(prog.half_day_minutes);
    full = asMinutes(prog.full_day_minutes);
  } else {
    workedMinutes = (day?.worked_minutes || 0) + (openMs !== null ? Math.max(0, Math.floor((nowMs - openMs) / MIN)) : 0);
    // A late check-in can push the expected end out (late extension): the day is only done once that time is worked too.
    expectedMinutes = (s.expected_minutes || 0) + (s.expected_minutes ? live?.extension_minutes || 0 : 0);
    const cls = s.rules?.day_classification;
    const byWorked = cls?.basis === 'worked_percent' || cls?.basis === 'worked_minutes';
    half = byWorked ? asMinutes(cls?.half_day_minutes) : null;
    full = byWorked ? asMinutes(cls?.full_day_minutes) : null;
  }
  const closed = openMs === null && !!day?.last_out_at;
  const base = {
    band: workBand(workedMinutes, expectedMinutes, half, full),
    marks: [half, full].filter((m): m is number => m !== null && expectedMinutes > 0 && m < expectedMinutes).map((m) => m / expectedMinutes),
    verdict: closed && day?.status ? day.status : null,
    inProgress: openMs !== null || !day?.first_in_at,
    workedMinutes,
    expectedMinutes,
    inAt: day?.first_in_at || s.open_since,
    outAt: openMs === null ? day?.last_out_at || null : null,
    expectedEndAt: live?.expected_end_at || day?.expected_end_at || null,
    lateMinutes: live?.late ? live.late_minutes : 0,
    onBreak: !!s.break?.active,
    reviewPending: !!day?.review_pending,
    shiftText: shiftText(s, tz),
  };

  if (!s.policy_resolved) return { ...base, tone: 'muted', headline: 'No attendance policy', detail: 'Ask HR to assign you a policy' };
  if (openMs !== null) {
    return { ...base, tone: 'live', headline: base.onBreak ? 'On a break' : 'Checked in', detail: `Since ${formatTime(s.open_since, tz)}` };
  }
  if (day?.first_in_at) {
    return { ...base, tone: STATUS_TONE[day.status] || 'muted', headline: 'Checked out', detail: day.status ? `Marked ${day.status}` : null };
  }

  const dayRule = s.rules?.day;
  const off = s.shift?.off || (dayRule && OFF_LABEL[dayRule.type] ? dayRule.type : null);
  if (off) return { ...base, tone: 'muted', headline: OFF_LABEL[off] || 'Day off', detail: dayRule?.holiday?.name || 'Enjoy your day' };
  if (dayRule?.leave && dayRule.leave.units >= 1) return { ...base, tone: 'muted', headline: 'On leave', detail: 'Approved leave for today' };

  const startMs = at(s.shift?.start);
  const endMs = at(s.shift?.end);
  const lateMs = at(s.rules?.late.late_after);
  if (endMs !== null && nowMs > endMs) return { ...base, tone: 'bad', headline: 'No check-in today', detail: 'Shift has ended. Request a regularization if you worked' };
  if (lateMs !== null && nowMs > lateMs) return { ...base, tone: 'bad', headline: 'Not checked in', detail: `Late since ${formatTime(s.rules?.late.late_after, tz)}` };
  if (startMs !== null && nowMs < startMs) return { ...base, tone: 'muted', headline: `Shift starts at ${formatTime(s.shift?.start, tz)}`, detail: s.rules?.check_in.earliest_at ? `Check-in opens ${formatTime(s.rules.check_in.earliest_at, tz)}` : null };
  return { ...base, tone: 'warn', headline: 'Not checked in yet', detail: lateMs !== null ? `Check in by ${formatTime(s.rules?.late.late_after, tz)} to be on time` : null };
}
