import type { MonthResponseDto } from '@/features/detailed-attendance/types/detailed.dto';

/** GET /attendance/me/snapshot — the lean "today" card the app bootstrap carries. Only the fields the dashboard reads. */
export interface SnapshotDto {
  date: string;
  timezone: string;
  policy_resolved: boolean;
  timing_mode?: string | null;
  shift: {
    start: string | null;
    end: string | null;
    break_minutes?: number;
    flexible_hours?: number | null;
    /** holiday | week_off | roster_leave, or a roster slot kind; null on a working day. */
    off: string | null;
  } | null;
  next_action: 'check_in' | 'check_out';
  open_since: string | null;
  expected_minutes?: number;
  /** Server-computed policy-correct figures as of `as_of`; null/absent before a punch, on an off day, or on an older backend. */
  progress?: {
    as_of: string;
    worked_minutes: number;
    expected_minutes: number;
    extension_minutes?: number;
    expected_end_at?: string | null;
    half_day_minutes?: number | null;
    full_day_minutes?: number | null;
  } | null;
  break?: { enabled: boolean; active?: boolean; since?: string | null; used_minutes?: number };
  rules?: {
    day: { type: string; off_half: string | null; holiday: { name: string } | null; leave: { units: number } | null };
    late: { late_after: string | null; grace_minutes: number | null };
    check_in: { earliest_at: string | null };
    live: { late: boolean; late_minutes: number; extension_minutes?: number; expected_end_at: string | null } | null;
    /** worked_percent / worked_minutes carry the half-day and full-day marks in worked minutes. */
    day_classification?: { basis: string; half_day_minutes?: number | null; full_day_minutes?: number | null };
  };
  day: {
    status: string;
    worked_minutes: number;
    first_in_at: string | null;
    last_out_at: string | null;
    expected_end_at: string | null;
    late_mark: boolean;
    review_pending: boolean;
    session_count: number;
  } | null;
}

/** GET /attendance-records/me/cycle — the month shape for the pay cycle holding today. */
export interface CycleResponseDto extends MonthResponseDto {
  period: { kind: 'month' | 'cycle'; frequency: string; from: string; to: string };
}

/** GET /attendance/me/upcoming — today and the six days after it. */
export interface UpcomingDayDto {
  date: string;
  /** working | week_off | half_week_off | holiday | half_holiday | roster_leave | unscheduled | no_policy */
  type: string;
  off_half: string | null;
  timing_mode: string | null;
  shift: { start: string; end: string } | null;
  flexible_hours: number | null;
  holiday: { name: string; session: string; optional: boolean } | null;
  leave: { units: number } | null;
}

export interface UpcomingDto {
  timezone: string;
  today: string;
  days: UpcomingDayDto[];
}

/** GET /attendance/me/regularizations — the fields the dashboard reads. */
export interface RegularizationRowDto { id: number; date: string; status: string; kinds: string[]; created_at?: string | null }

/** GET /attendance/me/permissions */
export interface PermissionRowDto { id: number; date: string; kind: 'permission' | 'gate_pass'; from_at: string; to_at: string; minutes: number; state: string }
