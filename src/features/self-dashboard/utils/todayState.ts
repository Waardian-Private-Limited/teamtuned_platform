import { formatTime } from '@/lib/datetime';
import type { SnapshotDto } from '../types/selfDashboard.dto';

export type TodayTone = 'live' | 'good' | 'warn' | 'bad' | 'muted';

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

/** What the today card says right now. Pure: the same snapshot and clock always give the same card. */
export function todayState(s: SnapshotDto, nowMs: number): TodayState {
  const tz = s.timezone;
  const day = s.day;
  const openMs = at(s.open_since);
  const workedMinutes = (day?.worked_minutes || 0) + (openMs !== null ? Math.max(0, Math.floor((nowMs - openMs) / MIN)) : 0);
  const live = s.rules?.live || null;
  const base = {
    workedMinutes,
    expectedMinutes: s.expected_minutes || 0,
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
