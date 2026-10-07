export type TrackingState = 'moving' | 'stationary' | 'on_site' | 'off_site' | 'on_break' | 'on_trip' | 'gps_off' | 'signal_lost' | 'stopped';

export interface FenceDto {
  id: number;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface LiveEmployeeDto {
  employee_id: number;
  name: string;
  employee_code: string | null;
  department_id: number | null;
  role_id: number | null;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  recorded_at: string | null;
  last_seen_at: string;
  state: TrackingState;
  site_id: number | null;
  site_name: string | null;
  battery: number | null;
}

export interface LiveBoardDto {
  employees: LiveEmployeeDto[];
  counts: Partial<Record<TrackingState, number>>;
  sites: FenceDto[];
  as_of: string;
}

export interface RoutePointDto {
  at: string;
  lat: number;
  lng: number;
  acc: number | null;
  battery: number | null;
}

export interface SegmentDto {
  kind: 'site' | 'stay' | 'move' | 'gap';
  from: string;
  to: string;
  minutes: number;
  siteId: number | null;
  site_name: string | null;
  lat: number | null;
  lng: number | null;
  distanceM: number;
  /** Why a gap has no track: location/permission off, phone switched off, or no signal. */
  reason?: 'gps_off' | 'phone_off' | 'no_signal';
}

export interface DaySummaryDto {
  distance_m: number;
  moving_minutes: number;
  stationary_minutes: number;
  site_minutes: number;
  outside_minutes: number;
  /** The part of site / away time between check-in and check-out. */
  checked_in_site_minutes?: number;
  checked_in_outside_minutes?: number;
  gap_minutes: number;
  gps_off_minutes: number;
  point_count: number;
  flags: string[];
  processed_at: string | null;
  window_from: string | null;
  window_to: string | null;
}

export interface ActionDto {
  action: string;
  key: string;
  outcome: string;
  at?: number;
  reason?: string;
}

export interface TimelineDto {
  employee: { id: number; name: string };
  date: string;
  summary: DaySummaryDto | null;
  route: RoutePointDto[];
  raw_points: number;
  segments: SegmentDto[];
  actions: ActionDto[];
  punches: Array<{ id: number; direction: 'in' | 'out'; kind: string; punched_at: string; place_name: string | null; location_result: string; source?: string }>;
  breaks: Array<{ id: number; started_at: string; ended_at: string | null; start_source: string; end_source: string | null; flags: string[] }>;
  device_events: Array<{ at: string; kind: string; detail: string | null }>;
  sites: FenceDto[];
}

export interface DayRowDto {
  employee_id: number;
  name: string;
  employee_code: string | null;
  distance_m: number;
  moving_minutes: number;
  stationary_minutes: number;
  site_minutes: number;
  outside_minutes: number;
  /** The part of site / away time between check-in and check-out. */
  checked_in_site_minutes?: number;
  checked_in_outside_minutes?: number;
  gap_minutes: number;
  gps_off_minutes: number;
  point_count: number;
  flags: string[];
}

export interface DaysResponseDto {
  total: number;
  days: DayRowDto[];
}

export interface TrackingPolicyDto {
  id: number;
  name: string;
  description: string | null;
  sub_organization_id: number | null;
  revision: number;
  is_default: boolean;
  status: 'active' | 'archived';
  assigned?: number;
  config: Record<string, unknown>;
  updated_at: string;
}

export interface PolicySchemaDto {
  schema: Record<string, unknown>;
  defaults: Record<string, unknown>;
  version: number;
}

export interface TrackedEmployeeDto {
  employee_id: number;
  employee_code: string | null;
  name: string;
  department_id: number | null;
  role_id: number | null;
  enabled: boolean;
  policy_id: number | null;
  policy_name: string | null;
  consent: 'pending' | 'accepted' | 'withdrawn';
  platform: string | null;
  app_version: string | null;
  last_seen_at: string | null;
  photo_url?: string | null;
  state: TrackingState | null;
  battery: number | null;
}

export interface TrackedEmployeesResponseDto {
  total: number;
  employees: TrackedEmployeeDto[];
}

export interface TrackingFilters {
  subOrgId?: number | null;
  departmentId?: number | null;
  roleId?: number | null;
  siteId?: number | null;
  policyId?: number | null;
}

export type TripStatus = 'active' | 'ended' | 'submitted' | 'approved' | 'rejected' | 'auto_closed';

export interface TripStopDto {
  seq: number;
  arrived_at: string | null;
  left_at: string | null;
  minutes: number;
  lat: number;
  lng: number;
  site_id: number | null;
  customer: string | null;
  note: string | null;
}

export interface TripDto {
  id: number;
  employee_id?: number;
  employee_name?: string | null;
  employee_code?: string | null;
  work_date: string;
  status: TripStatus;
  purpose: string | null;
  started_at: string | null;
  ended_at: string | null;
  start_kind: string;
  vehicle_label: string | null;
  rate_per_km: number | null;
  odo_start: number | null;
  odo_end: number | null;
  has_odo_start_image: boolean;
  has_odo_end_image: boolean;
  gps_distance_m: number;
  claimed_km: number | null;
  adjusted_km: number | null;
  approved_km: number | null;
  amount: number | null;
  site_minutes: number;
  outside_minutes: number;
  gap_minutes: number;
  stop_count: number;
  flags: string[];
  adjust_note: string | null;
  stops: TripStopDto[];
  route?: Array<{ at: string; lat: number; lng: number }>;
}

export interface TripsResponseDto {
  total: number;
  trips: TripDto[];
}
