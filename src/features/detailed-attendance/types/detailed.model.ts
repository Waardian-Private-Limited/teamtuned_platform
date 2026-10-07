import type { BadgeTone, OnlyKey, OverrideStatus } from './detailed.dto';

export type { BadgeTone, OnlyKey, OverrideStatus };

export interface Badge {
  key: string;
  label: string;
  tone: BadgeTone;
  note: string | null;
  overridden: boolean;
}

export interface AttendanceRow {
  employeeId: number;
  code: string | null;
  name: string;
  department: string | null;
  role: string | null;
  badge: Badge;
  inAt: string | null;
  outAt: string | null;
  workedMinutes: number;
  site: string | null;
  offSite: boolean;
  locked: boolean;
  nightOtYesterdayMinutes: number;
  month: { payableDays: number; present: number; halfDays: number; absent: number; leaveDays: number; lateMarks: number };
}

export interface AttendanceList {
  date: string;
  today: string;
  timezone: string;
  total: number;
  rows: AttendanceRow[];
}

export interface EmployeeHeader {
  id: number;
  code: string | null;
  name: string;
  department: string | null;
  role: string | null;
  status: string;
  joiningDate: string | null;
  exitDate: string | null;
}

export interface MonthCell {
  date: string;
  day: number;
  weekday: number;
  badge: Badge;
  inAt: string | null;
  outAt: string | null;
  workedMinutes: number;
  payableUnits: number;
  lateMinutes: number;
  overtimeMinutes: number;
  leave: { code: string; name: string; units: number; isPaid: boolean } | null;
}

export interface MonthSummary {
  calendarDays: number;
  payableDays: number;
  payableDaysBeforeLateDeduction: number;
  lopDays: number;
  lop: { absent: number; halfDay: number; other: number; unpaidLeave: number; sandwich: number; lateDeduction: number };
  present: number;
  halfDays: number;
  absent: number;
  leaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  holidays: number;
  weekOffs: number;
  late: { marks: number; minutes: number; hours: number };
  early: { marks: number; exitMinutes: number };
  overtime: { minutes: number; hours: number };
  nightOt: { minutes: number; hours: number };
  worked: { minutes: number; hours: number };
  lateDeduction: { enabled: boolean; minutes: number; chargeableMinutes: number; freeMinutes: number; days: number };
  consecutiveAbsence: { days: number; action: string } | null;
}

/** A leave type or the comp-off balance: one list so everything the employee can take is in one place. */
export interface Balance {
  code: string;
  name: string;
  kind: 'leave' | 'comp_off';
  color: string | null;
  isPaid: boolean | null;
  available: number;
  used: number;
  pending: number;
  credited: number;
  period: 'monthly' | 'cycle';
  earned: { units: number; pendingUnits: number; paidMinutes: number } | null;
}

export interface Month {
  employee: EmployeeHeader;
  month: string;
  timezone: string;
  from: string;
  to: string;
  today: string;
  policy: { resolved: boolean; lateDeduction: boolean; sandwich: boolean };
  cells: MonthCell[];
  summary: MonthSummary;
  balances: Balance[];
}

export interface DayRecord {
  status: string;
  payableUnits: number;
  dayType: string;
  shiftStartAt: string | null;
  shiftEndAt: string | null;
  firstInAt: string | null;
  lastOutAt: string | null;
  openSession: boolean;
  expectedMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  lateBeyondGraceMinutes: number;
  lateExcusedMinutes: number;
  earlyMinutes: number;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  nightOtMinutes: number;
  lateMark: boolean;
  earlyMark: boolean;
  latePenalty: 'half_day' | 'full_day' | null;
  earlyPenalty: 'half_day' | 'full_day' | null;
  lateMarkNumber: number;
  earlyMarkNumber: number;
  flags: string[];
  reviewState: string;
  overridden: boolean;
  locked: boolean;
}

export interface Punch {
  id: number;
  direction: 'in' | 'out';
  kind: 'work' | 'night_ot';
  at: string;
  source: string;
  place: string | null;
  location: string;
  distanceM: number | null;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  hasImage: boolean;
  face: string;
  voided: boolean;
  voidReason: string | null;
}

export interface Shift {
  start: string;
  end: string;
  endsNextDay: boolean;
  breakMinutes: number;
  expectedMinutes: number;
}

export interface DaySchedule {
  kind: 'absent' | 'week_off' | 'holiday' | 'leave' | 'unscheduled' | 'working';
  roster: boolean;
  flexible: boolean;
  shift: Shift | null;
}

/** Who changed the day, why and when: a forced status and/or the hours HR set. */
export interface DayOverride {
  status: string | null;
  units: number | null;
  reason: string | null;
  by: string | null;
  at: string | null;
  inTime: string | null;
  outTime: string | null;
}

export interface OverrideForm {
  inTime: string | null;
  outTime: string | null;
  from: 'recorded' | 'shift' | 'empty';
  forcedStatus: string | null;
}

export interface DayDetail {
  employee: EmployeeHeader;
  date: string;
  today: string;
  timezone: string;
  badge: Badge;
  day: DayRecord | null;
  schedule: DaySchedule | null;
  form: OverrideForm;
  holiday: { name: string; half: boolean } | null;
  leave: { code: string; name: string; units: number; isPaid: boolean } | null;
  nightOtYesterdayMinutes: number;
  override: DayOverride | null;
  punches: Punch[];
  breaks: Array<{ id: number; startedAt: string; endedAt: string | null }>;
  compOff: Array<{ reason: string; kind: 'comp_off' | 'paid'; units: number; minutes: number | null; state: string }>;
  history: Array<{ id: number; at: string; kind: string; summary: string | null; reason: string | null; by: string | null }>;
  canOverride: boolean;
  locked: boolean;
}

export interface Change<T> {
  from: T;
  to: T;
  changed: boolean;
}

export interface Impact {
  status: Change<string | null>;
  payableUnits: Change<number>;
  late: { mark: Change<boolean>; minutes: Change<number>; penalty: Change<string | null> };
  early: { mark: Change<boolean>; minutes: Change<number>; penalty: Change<string | null> };
  overtimeMinutes: Change<number>;
  nightOtMinutes: Change<number>;
  compOff: Array<{ key: string; reason: string; kind: 'comp_off' | 'paid'; action: 'new' | 'more' | 'less' | 'removed'; unitsFrom: number; unitsTo: number; minutes: number | null; needsApproval: boolean }>;
  leaveBalanceReturned: boolean;
  leaveFraction: number | null;
  otherDays: Array<{ date: string; status: Change<string | null>; payableUnits: Change<number> }>;
  changed: boolean;
}
