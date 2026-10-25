export type HolidaySession = 'full' | 'first_half' | 'second_half';

export interface HolidaySite {
  site_id: number;
  session: HolidaySession | null;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  type: string | null;
  description: string | null;
  session: HolidaySession;
  is_optional: boolean;
  status: 'active' | 'inactive';
  sub_organization_id: number | null;
  sites: HolidaySite[];
}

export interface HolidayListResponse {
  holidays: Holiday[];
  year: number;
  total: number;
}

export interface HolidayInput {
  name: string;
  date: string;
  type: string;
  description: string;
  session: HolidaySession;
  is_optional: boolean;
  status: 'active' | 'inactive';
  sub_organization_id: number | null;
  sites: HolidaySite[];
}

/** What an employee can do about one optional holiday, when the policy lets them take it. */
export interface OptionalChoice {
  choice: { id: number; state: 'pending' | 'approved' | 'rejected' | 'cancelled' } | null;
  can_apply: boolean;
  can_cancel: boolean;
  /** A HOLIDAY_OPTIONAL_* code saying why not, when the policy has a reason. */
  blocked_reason: string | null;
}

/** The year's optional holiday allowance: what is allotted, taken and left. */
export interface OptionalPolicy {
  enabled: boolean;
  limit: number;
  used: number;
  remaining: number;
  apply_before_days: number;
  cancel_before_days: number;
  needs_approval: boolean;
  /** The leave year the balance is for. */
  period?: { start: string; end: string };
}

export interface MyHoliday {
  id: number;
  date: string;
  name: string;
  session: HolidaySession;
  is_optional: boolean;
  type: string | null;
  optional?: OptionalChoice;
}

export interface MyHolidaysResponse {
  holidays: MyHoliday[];
  year: number;
  optional_policy?: OptionalPolicy;
}
