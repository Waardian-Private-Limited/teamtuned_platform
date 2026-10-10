/** What can be asked for when a day's attendance is wrong. The server says which apply to a day. */
export type RegularizationKind =
  | 'missed_checkout'
  | 'missed_checkin'
  | 'missed_both'
  | 'wrong_time'
  | 'remove_late_mark'
  | 'remove_late_penalty'
  | 'remove_early_mark'
  | 'remove_early_penalty';

export type RegularizationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface RegularizationRequest {
  id: number;
  date: string;
  status: RegularizationStatus;
  kinds: RegularizationKind[];
  inTime: string | null;
  outTime: string | null;
  recordedInTime: string | null;
  recordedOutTime: string | null;
  reason: string | null;
  reviewNote: string | null;
  hasAttachment: boolean;
  submittedAt: string | null;
}

export interface RegularizationPolicy {
  allowed: boolean;
  backDays: number;
  /** HH:MM in the organization's timezone, or null when the whole day counts. */
  cutoffTime: string | null;
  perMonth: number;
  used: number;
  remaining: number;
  needsApproval: boolean;
}

export interface RegularizationOptions {
  date: string;
  timezone: string;
  policy: RegularizationPolicy;
  deadlineAt: string | null;
  eligible: boolean;
  /** The server's code for why a request cannot be raised, e.g. ATTENDANCE_REGULARIZE_WINDOW_CLOSED. */
  blockedReason: string | null;
  day: {
    dayType: string;
    holiday: { name: string; half: boolean } | null;
    recordedIn: string | null;
    recordedOut: string | null;
    shiftStart: string | null;
    shiftEnd: string | null;
  };
  /** The fixes that apply to this day, in the order to show them. */
  kinds: RegularizationKind[];
  request: RegularizationRequest | null;
}

/** A fix that changes punch times; only one can be chosen at once. */
export const isTimeKind = (k: RegularizationKind) => k === 'missed_checkout' || k === 'missed_checkin' || k === 'missed_both' || k === 'wrong_time';
export const asksIn = (k: RegularizationKind | null) => k === 'missed_checkin' || k === 'missed_both' || k === 'wrong_time';
export const asksOut = (k: RegularizationKind | null) => k === 'missed_checkout' || k === 'missed_both' || k === 'wrong_time';
