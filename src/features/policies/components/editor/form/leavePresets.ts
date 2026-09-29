// Starting values for a leave type's rule when an admin switches it on in a
// policy, keyed by the seeded catalogue code (LeaveTypeCatalog.js). They
// are only a first draft of the rule: every value stays editable, and a
// custom leave type (no preset) starts from the schema defaults.
//
// Each preset is a partial rule deep-merged over the schema defaults, so it
// names only what differs from them.

type Preset = Record<string, unknown>;

const on = (value: number) => ({ enabled: true, value });

const PER_EVENT_CALENDAR_DAYS = {
  dayCounting: { weekOffsInside: 'count', holidaysInside: 'count', sandwich: 'off' },
};

export const LEAVE_PRESETS: Record<string, Preset> = {
  ANNUAL: {
    entitlement: { mode: 'monthly', daysPerMonth: 1.5 },
    request: { notice: on(7) },
    carryForward: { enabled: true, carryMode: 'capped', maxDays: 30 },
    encashOnExit: { enabled: true },
  },
  CASUAL: {
    entitlement: { mode: 'yearly', daysPerYear: 12 },
    request: { maxPerRequest: on(3) },
  },
  SICK: {
    entitlement: { mode: 'yearly', daysPerYear: 12 },
    request: { attachment: 'longer_than', attachmentAfterDays: 2 },
  },
  PTO: {
    entitlement: { mode: 'monthly', daysPerMonth: 1.5 },
    carryForward: { enabled: true, carryMode: 'capped', maxDays: 10 },
  },
  MATERNITY: {
    entitlement: { mode: 'per_event', daysPerEvent: 182 },
    eligibility: { genders: ['female'], waitingPeriod: on(80) },
    request: { smallestUnit: 'full_day', attachment: 'always', notice: on(30) },
    ...PER_EVENT_CALENDAR_DAYS,
  },
  PATERNITY: {
    entitlement: { mode: 'per_event', daysPerEvent: 15 },
    eligibility: { genders: ['male'] },
    request: { smallestUnit: 'full_day', attachment: 'always' },
  },
  ADOPTION: {
    entitlement: { mode: 'per_event', daysPerEvent: 84 },
    request: { smallestUnit: 'full_day', attachment: 'always' },
    ...PER_EVENT_CALENDAR_DAYS,
  },
  MARRIAGE: {
    entitlement: { mode: 'per_event', daysPerEvent: 5 },
    request: { smallestUnit: 'full_day', attachment: 'always', notice: on(15) },
    block: { rule: 'exact_days', blockDays: 5 },
    frequency: { requestsLifetime: on(1) },
  },
  BEREAVEMENT: {
    entitlement: { mode: 'per_event', daysPerEvent: 3 },
    request: { smallestUnit: 'full_day', pastDates: on(7) },
  },
  LWP: {
    entitlement: { mode: 'unlimited' },
  },
  COMPOFF: {
    entitlement: { mode: 'none' },
    request: { notice: on(1) },
  },
  SABBATICAL: {
    entitlement: { mode: 'per_event', daysPerEvent: 90 },
    eligibility: { waitingPeriod: on(1825) },
    request: { smallestUnit: 'full_day', notice: on(60) },
    frequency: { requestsLifetime: on(1) },
    ...PER_EVENT_CALENDAR_DAYS,
  },
  MENSTRUAL: {
    entitlement: { mode: 'monthly', daysPerMonth: 1, monthlyCarryForward: 'lapse_each_month' },
    eligibility: { genders: ['female'] },
    request: { maxPerRequest: on(1), notice: { enabled: false, value: 0 } },
  },
  BIRTHDAY: {
    entitlement: { mode: 'per_event', daysPerEvent: 1 },
    request: { smallestUnit: 'full_day' },
    frequency: { requestsPerYear: on(1) },
  },
  OPTIONAL_HOLIDAY: {
    entitlement: { mode: 'yearly', daysPerYear: 2 },
    request: { smallestUnit: 'full_day' },
  },
  RELIGIOUS: {
    entitlement: { mode: 'yearly', daysPerYear: 2 },
    request: { smallestUnit: 'full_day' },
  },
  WFH: { entitlement: { mode: 'unlimited' } },
  ON_DUTY: { entitlement: { mode: 'unlimited' } },
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(patch) || !isPlainObject(base)) return (patch === undefined ? base : patch) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? deepMerge(out[key], value) : value;
  }
  return out as T;
}
