export interface PersonPhotoDto {
  photo_url: string | null;
  photo_version: string | null;
}

export interface MyProfileManagerDto extends PersonPhotoDto {
  id: number;
  code: string | null;
  name: string | null;
  designation: string | null;
}

export interface MyProfileSiteDto {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  primary: boolean;
}

export interface MyProfileRosterDayDto {
  date: string;
  kind: 'shift' | 'off' | 'leave' | 'holiday' | 'comp_off' | 'unavailable';
  name: string | null;
  start: string | null;
  end: string | null;
  break_minutes: number | null;
}

export interface MyProfileShiftDto {
  kind: 'template' | 'custom' | 'standard' | 'flexible' | 'roster';
  name: string | null;
  start: string | null;
  end: string | null;
  duration_minutes?: number | null;
  break_minutes: number | null;
  flexible_hours: number | null;
  days?: MyProfileRosterDayDto[];
}

export interface MyProfileAddressDto {
  type: string;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
}

export interface MyProfileDto {
  employee: PersonPhotoDto & {
    id: number;
    code: string | null;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    designation: string | null;
    status: string;
  };
  organization: { name: string; logo_url: string | null };
  sub_organization: { name: string; logo_url: string | null } | null;
  work: {
    department: string | null;
    role: string | null;
    employment_type: string | null;
    joining_date: string | null;
    confirmation_date: string | null;
    exit_date: string | null;
    probation_months: number | null;
    notice_period_days: number | null;
    manager: MyProfileManagerDto | null;
    sites: MyProfileSiteDto[];
    shift: MyProfileShiftDto | null;
  };
  personal: { date_of_birth: string | null; gender: string | null; marital_status: string | null };
  contact: { email: string | null; phone: string | null; addresses: MyProfileAddressDto[] };
  emergency_contacts: { name: string | null; relation: string | null; phone: string | null; primary: boolean }[];
  bank: {
    bank_name: string | null;
    branch_name: string | null;
    ifsc: string | null;
    account_masked: string | null;
    pan_masked: string | null;
    aadhaar_masked: string | null;
    uan_masked: string | null;
  } | null;
}
