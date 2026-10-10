/** Wire shapes of the employee's own regularization endpoints (`/attendance/me/regularizations`). */

export interface RegularizationRequestDto {
  id: number;
  date: string;
  status: string;
  kinds: string[];
  in_time: string | null;
  out_time: string | null;
  recorded_in_time: string | null;
  recorded_out_time: string | null;
  reason: string | null;
  review_note: string | null;
  has_attachment: boolean;
  submitted_at: string | null;
}

export interface RegularizationOptionsDto {
  date: string;
  timezone: string;
  policy: {
    allowed: boolean;
    back_days: number;
    cutoff_time: string | null;
    per_month: number;
    used: number;
    remaining: number;
    needs_approval: boolean;
  };
  deadline_at: string | null;
  eligible: boolean;
  blocked_reason: string | null;
  day: {
    day_type: string;
    status: string | null;
    holiday: { name: string; half: boolean } | null;
    leave: { units: number } | null;
    recorded_in_time: string | null;
    recorded_out_time: string | null;
    shift_start_time: string | null;
    shift_end_time: string | null;
    late_mark: boolean;
    late_penalty: string | null;
    late_minutes: number;
    early_mark: boolean;
    early_penalty: string | null;
    early_minutes: number;
  };
  kinds: string[];
  request: RegularizationRequestDto | null;
}

export interface RegularizationSubmitBody {
  date: string;
  kinds: string[];
  in_time?: string;
  out_time?: string;
  reason: string;
  /** The device clock, kept next to the server's for whoever reviews the request. */
  client_at: string;
  client_tz: string;
}
