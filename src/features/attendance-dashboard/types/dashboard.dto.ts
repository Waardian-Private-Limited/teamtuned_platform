export type DayStatus = 'working' | 'completed' | 'half_day' | 'absent' | 'not_checked_in' | 'on_leave' | 'holiday' | 'week_off';

/** What the list can be narrowed to: one status, or a cross-cutting view. */
export type EmployeeView = DayStatus | 'all' | 'present' | 'late' | 'review';

export interface DashboardFilters {
  date: string;
  subOrgId: number | null;
  siteId: number | null;
  departmentId: number | null;
  roleId: number | null;
}

export interface FilterOptionsDto {
  today: string;
  timezone: string;
  access: { all_sites: boolean; pick_sub_org: boolean; all_sub_orgs: boolean };
  sub_organizations: Array<{ id: number; name: string; code: string; is_primary: boolean }>;
  sites: Array<{ id: number; name: string; city: string | null; is_head_office: boolean }>;
  departments: Array<{ id: number; name: string }>;
  roles: Array<{ id: number; name: string; department_id: number | null }>;
}

export interface SummaryDto {
  headcount: number;
  expected: number;
  present: number;
  counts: Record<DayStatus, number>;
  late: number;
  review_pending: number;
  rates: { attendance: number | null; punctuality: number | null; absence: number | null };
  minutes: { average_worked: number; overtime: number; night_ot: number };
}

export interface TrendPointDto {
  date: string;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  overtime_minutes: number;
  attendance_rate: number | null;
}

export interface BreakdownRowDto {
  id: number | null;
  name: string | null;
  headcount: number;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  attendance_rate: number | null;
}

export interface OverviewDto {
  date: string;
  is_today: boolean;
  timezone: string;
  summary: SummaryDto;
  arrivals: Array<{ hour: number; count: number }>;
  trend: TrendPointDto[];
  by_department: BreakdownRowDto[];
  by_site: BreakdownRowDto[];
}

export interface DashboardEmployeeDto {
  employee_id: number;
  employee_code: string | null;
  name: string;
  photo_url: string | null;
  department: string | null;
  role: string | null;
  site: string | null;
  status: DayStatus;
  late: boolean;
  review_pending: boolean;
  first_in_at: string | null;
  last_out_at: string | null;
  worked_minutes: number;
  late_minutes: number;
  overtime_minutes: number;
}

export interface EmployeesResponseDto {
  date: string;
  total: number;
  employees: DashboardEmployeeDto[];
}

export type LeaderPeriod = 'day' | 'week' | 'month';
export type LeaderBoardKey = 'early_birds' | 'late_comers' | 'most_punctual' | 'best_attendance' | 'most_hours' | 'most_overtime';

export interface LeaderEntryDto {
  rank: number;
  employee_id: number;
  employee_code: string | null;
  name: string | null;
  department: string | null;
  photo_url: string | null;
  value: number | null;
  unit: 'clock' | 'minutes' | 'days' | 'percent';
  stats: {
    present_days: number;
    absent_days: number;
    on_time_days: number;
    late_days: number;
    late_minutes: number;
    worked_minutes: number;
    overtime_minutes: number;
    average_arrival: number | null;
  };
}

export interface LeaderBoardDto {
  key: LeaderBoardKey;
  total: number;
  entries: LeaderEntryDto[];
}

export interface LeadersDto {
  period: LeaderPeriod;
  from: string;
  to: string;
  timezone: string;
  boards: LeaderBoardDto[];
}

export interface LeaderBoardPageDto {
  period: LeaderPeriod;
  from: string;
  to: string;
  board: LeaderBoardKey;
  total: number;
  entries: LeaderEntryDto[];
}
