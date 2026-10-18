export type SlotKind = 'shift' | 'off' | 'leave' | 'holiday' | 'comp_off' | 'unavailable';
export type RosterState = 'current' | 'upcoming' | 'past';

/** One published slot on a date: a shift with its times, or an off / leave / holiday day. */
export interface RosterSlot {
  rosterId: number | null;
  date: string;
  seq: number;
  kind: SlotKind;
  name: string | null;
  code: string | null;
  /** HH:MM, the organization's clock. */
  start: string | null;
  end: string | null;
  endsNextDay: boolean;
  breakMinutes: number;
  /** Shift length less the break. */
  plannedMinutes: number;
  overtime: boolean;
  plannedOtMinutes: number;
  earnsCompOff: boolean;
  team: string | null;
}

/** A roster the employee is on, with their own share of it. */
export interface MyRoster {
  id: number;
  team: string | null;
  periodStart: string;
  periodEnd: string;
  state: RosterState;
  version: number | null;
  publishedAt: string | null;
  shifts: number;
  offs: number;
  leaves: number;
  plannedMinutes: number;
}

export interface MyRosterList {
  today: string;
  total: number;
  page: number;
  pageSize: number;
  items: MyRoster[];
}

export interface MyRosterDetail {
  today: string;
  roster: MyRoster;
  days: Array<{ date: string; slots: RosterSlot[] }>;
}
