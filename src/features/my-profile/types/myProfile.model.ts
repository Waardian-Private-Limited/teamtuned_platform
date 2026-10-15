export interface Person {
  name: string;
  initials: string;
  photoUrl: string | null;
}

export interface ProfileRow {
  label: string;
  value: string;
}

export interface RosterDay {
  date: string;
  weekday: string;
  day: number;
  when: string;
  title: string;
  detail: string | null;
  isShift: boolean;
  isToday: boolean;
}

export interface ProfileShift {
  type: string;
  title: string | null;
  hours: string | null;
  breakLabel: string | null;
  roster: RosterDay[] | null;
}

export interface ProfileAddress {
  label: string;
  text: string;
}

export interface ProfileContact {
  name: string;
  relation: string | null;
  phone: string | null;
  primary: boolean;
}

export interface ProfileSite {
  id: number;
  name: string;
  place: string | null;
  primary: boolean;
}

export interface MyProfile {
  person: Person;
  code: string | null;
  designation: string | null;
  status: string;
  organization: { name: string; logoUrl: string | null };
  subOrganization: { name: string; logoUrl: string | null } | null;
  joined: { date: string; tenure: string | null } | null;
  department: string | null;
  manager: (Person & { code: string | null; designation: string | null }) | null;
  work: ProfileRow[];
  sites: ProfileSite[];
  shift: ProfileShift | null;
  personal: ProfileRow[];
  contact: ProfileRow[];
  addresses: ProfileAddress[];
  emergencyContacts: ProfileContact[];
  bank: ProfileRow[];
}
