import type { BucketUnit, InsightPeriod, PersonRefDto, TrendBucketDto } from '@/features/attendance-insights/types/insights.dto';

export type ScorecardMode = 'all' | 'team' | 'self';
export type ScorecardSort = 'name' | 'score' | 'attendance' | 'punctuality' | 'late_days' | 'overtime' | 'tasks' | 'meetings' | 'leave' | 'comp_off';

export interface ScorecardFilters {
  period: InsightPeriod;
  date: string;
  yearStart: 1 | 4;
  siteId: number | null;
  departmentId: number | null;
}

export interface AttendanceSectionDto {
  score: number | null;
  attendance_rate: number | null;
  punctuality_rate: number | null;
  expected_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  late_minutes: number;
  worked_minutes: number;
  overtime_minutes: number;
  night_ot_minutes: number;
  off_day_days: number;
}

export interface TaskSectionDto {
  score: number | null;
  done: number;
  done_on_time: number;
  done_late: number;
  overdue: number;
  open: number;
  on_time_rate: number | null;
  avg_rating: number | null;
}

export interface MeetingSectionDto {
  score: number | null;
  actions_done: number;
  actions_on_time: number;
  actions_overdue: number;
  actions_open: number;
  action_on_time_rate: number | null;
  meetings_invited: number;
  meetings_attended: number;
  attendance_rate: number | null;
}

export interface CardDto {
  score: number | null;
  attendance: AttendanceSectionDto;
  tasks?: TaskSectionDto;
  meetings?: MeetingSectionDto;
  comp_off: { earned_days: number; paid_days: number; pending_days: number };
  leave: { leave_days: number; unplanned_days: number; lop_days: number };
}

/** Averages have the card's shape, every number possibly null. */
type Loose<T> = { [K in keyof T]?: T[K] extends object | undefined ? Loose<NonNullable<T[K]>> | null : number | null };
export type AverageCardDto = Loose<CardDto> & { people: number; name?: string };

interface HeaderDto {
  period: InsightPeriod;
  date: string;
  today: string;
  year_start: 1 | 4;
  unit: BucketUnit;
  from: string;
  to: string;
  period_from: string;
  period_to: string;
  prev_date: string;
  next_date: string | null;
  mode: ScorecardMode;
  me: number | null;
  sections: { tasks: boolean; meetings: boolean };
  weights: Partial<Record<'attendance' | 'tasks' | 'meetings', number>>;
  min_items: number;
}

export type ScorecardRowDto = PersonRefDto & CardDto;

export interface ScorecardListDto extends HeaderDto {
  options: { sites: Array<{ id: number; name: string }>; departments: Array<{ id: number; name: string }> };
  headcount: number;
  average: AverageCardDto;
  employees: { total: number; limit: number; offset: number; items: ScorecardRowDto[] };
}

export interface ScorecardPersonDto extends HeaderDto {
  employee: PersonRefDto;
  card: CardDto;
  trend: TrendBucketDto[];
  compare: { department: AverageCardDto | null; site: AverageCardDto | null; everyone: AverageCardDto } | null;
  percentile: { score: number | null; in_scope: number } | null;
}
