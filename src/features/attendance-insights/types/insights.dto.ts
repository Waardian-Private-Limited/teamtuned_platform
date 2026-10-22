export type InsightPeriod = 'week' | 'month' | 'quarter' | 'year';
export type InsightGroup = 'site' | 'department' | 'employee';
export type BucketUnit = 'day' | 'week' | 'month';
export type InsightBoardKey = 'most_consistent' | 'least_consistent' | 'most_overtime' | 'most_night_ot' | 'most_off_day_work' | 'most_hours' | 'most_late';
export type InsightSort = 'name' | 'headcount' | 'consistency' | 'attendance_rate' | 'punctuality_rate' | 'overtime_minutes' | 'night_ot_minutes' | 'off_day_days' | 'late_days' | 'worked_minutes' | 'absent_days';

export interface InsightFilters {
  period: InsightPeriod;
  date: string;
  yearStart: 1 | 4;
  subOrgId: number | null;
  siteId: number | null;
  departmentId: number | null;
  roleId: number | null;
}

/** The sums behind every figure, and the rates derived from them. */
export interface FiguresDto {
  present_units: number;
  expected_days: number;
  present_working_units: number;
  present_working_days: number;
  absent_days: number;
  late_days: number;
  late_minutes: number;
  on_time_days: number;
  worked_minutes: number;
  overtime_minutes: number;
  night_ot_minutes: number;
  night_ot_days: number;
  off_day_days: number;
  off_day_minutes: number;
  leave_days: number;
  attendance_rate: number | null;
  punctuality_rate: number | null;
  consistency: number | null;
}

export interface PerHeadDto {
  overtime_minutes_per_head: number;
  night_ot_minutes_per_head: number;
  off_day_days_per_head: number;
}

export interface PersonRefDto {
  employee_id: number;
  employee_code: string | null;
  name: string;
  department: string | null;
  site: string | null;
  role: string | null;
  photo_url?: string | null;
}

export interface TrendBucketDto extends FiguresDto { key: string; from: string; to: string }

export interface BoardEntryDto extends PersonRefDto { rank: number; value: number; unit: 'score' | 'minutes' | 'days'; figures: FiguresDto & { id: number } }
export interface BoardDto { key: InsightBoardKey; total: number; entries: BoardEntryDto[] }

export interface GroupRowDto extends FiguresDto, PerHeadDto { id: number | null; name: string; headcount: number }
export interface EmployeeRowDto extends FiguresDto, PersonRefDto { id: number }

interface HeaderDto {
  period: InsightPeriod;
  date: string;
  today: string;
  timezone: string;
  year_start: 1 | 4;
  unit: BucketUnit;
  from: string;
  to: string;
  period_from: string;
  period_to: string;
  prev_date: string;
  next_date: string | null;
  formula: { consistency_weights: { attendance: number; punctuality: number }; min_expected_days: number };
}

export interface InsightsDto extends HeaderDto {
  group: InsightGroup;
  headcount: number;
  totals: FiguresDto & PerHeadDto;
  trend: TrendBucketDto[];
  boards: BoardDto[];
  groups: GroupRowDto[] | null;
  employees: { total: number; limit: number; offset: number; items: EmployeeRowDto[] } | null;
}

export interface AverageDto {
  people: number;
  attendance_rate: number | null;
  punctuality_rate: number | null;
  consistency: number | null;
  overtime_minutes: number | null;
  night_ot_minutes: number | null;
  off_day_days: number | null;
  late_days: number | null;
  worked_minutes: number | null;
  absent_days: number | null;
}

export interface InsightDayDto {
  date: string;
  day_type: string;
  status: string;
  late: boolean;
  late_minutes: number;
  worked_minutes: number;
  overtime_minutes: number;
  night_ot_minutes: number;
  off_day_work: boolean;
}

export interface EmployeeInsightsDto extends HeaderDto {
  employee: PersonRefDto;
  figures: FiguresDto & { id: number; name: string };
  trend: TrendBucketDto[];
  compare: { department: (AverageDto & { name: string }) | null; site: (AverageDto & { name: string }) | null; everyone: AverageDto };
  percentile: { consistency: number | null; attendance_rate: number | null; overtime_minutes: number | null; in_scope: number };
  days: InsightDayDto[] | null;
  /** Absent when Performance is off for the organization; latest null before any rating is released. */
  performance?: { latest: { cycle_id: number; cycle_name: string; period_start: string; period_end: string; band: string; score: number | null; released_at: string } | null };
}
