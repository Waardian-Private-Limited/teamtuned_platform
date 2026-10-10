/** Wire shapes of the attendance review lists (regularizations and attendance reviews). */

export interface ReviewRowDto {
  id: number;
  approval_id: number | null;
  employee: { id: number; name: string; code: string | null; department: string | null; role: string | null };
  date: string;
  status: string;
  waiting_for_me: boolean;
  waiting_on: { step: string | null; approvers: string[]; open_to_role: boolean; since: string | null } | null;
  kinds?: string[];
  in_time?: string | null;
  out_time?: string | null;
  recorded_in_time?: string | null;
  recorded_out_time?: string | null;
  recorded_in_place?: PlaceDto | null;
  recorded_out_place?: PlaceDto | null;
  reason?: string | null;
  has_attachment?: boolean;
  punches?: PunchDto[];
  submitted_at: string | null;
}

/** A punch sent for review, as the server describes it. */
export interface PunchDto {
  direction: 'in' | 'out';
  time: string;
  place: string | null;
  outside: boolean;
  distance_m: number | null;
  issues: string[];
  reason: string | null;
  review_state: string;
}

/** Where a recorded punch was made; outside means beyond the site's boundary. */
export interface PlaceDto {
  name: string | null;
  outside: boolean;
  distance_m: number | null;
}

export interface ReviewPageDto {
  items: ReviewRowDto[];
  total: number;
  /** Requests per status for the current filters, before the status filter. */
  counts?: Record<string, number>;
  scope?: 'assigned' | 'all';
  /** The status filter the server applied (its default when none was asked for). */
  status?: string;
  /** Whether this person may follow every request in reach, and whether that is every site. */
  access?: { can_track: boolean; all_sites: boolean };
  page: number;
  page_size: number;
}
