import type { BadgeTone, OverrideStatus } from './detailed.dto';

export type { BadgeTone, OverrideStatus };

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

export interface LeaveBalance {
  code: string;
  name: string;
  color: string | null;
  isPaid: boolean | null;
  available: number;
  used: number;
  pending: number;
  credited: number;
}

export interface Month {
  employee: EmployeeHeader;
  month: string;
  from: string;
  to: string;
  today: string;
  policy: { resolved: boolean; lateDeduction: boolean; sandwich: boolean };
  cells: MonthCell[];
  summary: MonthSummary;
  compOff: { available: number | null; period: 'monthly' | 'cycle'; earnedUnits: number; pendingUnits: number; paidMinutes: number };
  leaveBalances: LeaveBalance[];
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
  face: string;
  voided: boolean;
  voidReason: string | null;
}

export interface DayDetail {
  employee: EmployeeHeader;
  date: string;
  today: string;
  badge: Badge;
  day: DayRecord | null;
  holiday: { name: string; half: boolean } | null;
  leave: { code: string; name: string; units: number; isPaid: boolean } | null;
  nightOtYesterdayMinutes: number;
  override: { status: string; units: number | null; reason: string | null; by: string | null; at: string | null } | null;
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
