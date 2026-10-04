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

export interface MyHoliday {
  id: number;
  date: string;
  name: string;
  session: HolidaySession;
  is_optional: boolean;
  type: string | null;
}
