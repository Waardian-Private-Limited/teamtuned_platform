/** One published slot on a date, as the server sends it (times are the organization's clock, HH:MM). */
export interface RosterSlotDto {
  roster_id: number | null;
  date: string;
  seq: number;
  kind: 'shift' | 'off' | 'leave' | 'holiday' | 'comp_off' | 'unavailable';
  name: string | null;
  code: string | null;
  start: string | null;
  end: string | null;
  ends_next_day: boolean;
  break_minutes: number;
  planned_minutes: number;
  overtime: boolean;
  planned_ot_minutes: number;
  earns_comp_off: boolean;
  team: string | null;
}

export interface MyRosterDto {
  id: number;
  team: string | null;
  period_start: string;
  period_end: string;
  state: 'current' | 'upcoming' | 'past';
  status: string;
  version: number | null;
  published_at: string | null;
  shifts?: number;
  offs?: number;
  leaves?: number;
  planned_minutes?: number;
}

export interface MyRosterListDto {
  today: string;
  total: number;
  page: number;
  page_size: number;
  items: MyRosterDto[];
}

export interface MyRosterDetailDto {
  today: string;
  roster: MyRosterDto;
  days: Array<{ date: string; slots: RosterSlotDto[] }>;
}
