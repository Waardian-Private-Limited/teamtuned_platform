import { addDaysIso, formatDate, formatTime, initialsOf, localIsoDate, tenureSince, titleCase, weekdayOf } from '../utils/format';
import type { MyProfileDto, MyProfileRosterDayDto, MyProfileShiftDto } from './myProfile.dto';
import type { MyProfile, ProfileRow, ProfileShift, RosterDay } from './myProfile.model';

function rows(items: [string, string | number | null | undefined][]): ProfileRow[] {
  return items
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(([label, v]) => ({ label, value: String(v) }));
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

const SHIFT_TYPES: Record<MyProfileShiftDto['kind'], string> = {
  template: 'Assigned shift',
  custom: 'Custom timing',
  standard: 'Company hours',
  flexible: 'Flexible',
  roster: 'Roster',
};

const ROSTER_KINDS: Record<MyProfileRosterDayDto['kind'], string> = {
  shift: 'Shift',
  off: 'Week off',
  leave: 'On leave',
  holiday: 'Holiday',
  comp_off: 'Comp off',
  unavailable: 'Unavailable',
};

function hoursOf(start: string | null, end: string | null): string | null {
  const a = formatTime(start);
  const b = formatTime(end);
  return a && b ? `${a} – ${b}` : null;
}

function toRosterDay(d: MyProfileRosterDayDto, today: string): RosterDay {
  const isShift = d.kind === 'shift';
  const when = d.date === today ? 'Today' : d.date === addDaysIso(today, 1) ? 'Tomorrow' : weekdayOf(d.date, 'long');
  return {
    date: d.date,
    weekday: weekdayOf(d.date, 'short'),
    day: Number(d.date.slice(8, 10)),
    when,
    title: (isShift && hoursOf(d.start, d.end)) || ROSTER_KINDS[d.kind] || titleCase(d.kind) || '',
    detail: isShift ? d.name : null,
    isShift,
    isToday: d.date === today,
  };
}

function toShift(s: MyProfileShiftDto | null, today: string): ProfileShift | null {
  if (!s) return null;
  const breakLabel = s.break_minutes ? `${s.break_minutes} min break` : null;
  const type = SHIFT_TYPES[s.kind] || titleCase(s.kind) || 'Shift';
  if (s.kind === 'roster') {
    return { type, title: null, hours: null, breakLabel: null, roster: (s.days || []).map((d) => toRosterDay(d, today)) };
  }
  if (s.kind === 'flexible') {
    return { type, title: null, hours: s.flexible_hours ? `${s.flexible_hours} h/day` : null, breakLabel, roster: null };
  }
  return { type, title: s.name, hours: hoursOf(s.start, s.end), breakLabel, roster: null };
}

export function toMyProfile(dto: MyProfileDto): MyProfile {
  const name = dto.employee.name || [dto.employee.first_name, dto.employee.last_name].filter(Boolean).join(' ') || 'Employee';
  const w = dto.work;
  const manager = w.manager && w.manager.name
    ? {
        name: w.manager.name,
        initials: initialsOf(w.manager.name),
        photoUrl: w.manager.photo_url,
        code: w.manager.code,
        designation: w.manager.designation,
      }
    : null;
  const bank = dto.bank;

  return {
    person: { name, initials: initialsOf(name), photoUrl: dto.employee.photo_url },
    code: dto.employee.code,
    designation: dto.employee.designation,
    status: dto.employee.status,
    organization: { name: dto.organization.name, logoUrl: dto.organization.logo_url },
    subOrganization: dto.sub_organization ? { name: dto.sub_organization.name, logoUrl: dto.sub_organization.logo_url } : null,
    joined: w.joining_date ? { date: formatDate(w.joining_date) ?? w.joining_date, tenure: tenureSince(w.joining_date) } : null,
    department: w.department,
    manager,
    work: rows([
      ['Department', w.department],
      ['Role', w.role],
      ['Designation', dto.employee.designation],
      ['Employment type', titleCase(w.employment_type)],
      ['Joining date', formatDate(w.joining_date)],
      ['Confirmation date', formatDate(w.confirmation_date)],
      ['Probation', w.probation_months ? plural(w.probation_months, 'month') : null],
      ['Notice period', w.notice_period_days ? plural(w.notice_period_days, 'day') : null],
      ['Exit date', formatDate(w.exit_date)],
    ]),
    sites: w.sites.map((s) => ({ id: s.id, name: s.name, place: [s.city, s.state].filter(Boolean).join(', ') || null, primary: s.primary })),
    shift: toShift(w.shift, localIsoDate()),
    personal: rows([
      ['Date of birth', formatDate(dto.personal.date_of_birth)],
      ['Gender', titleCase(dto.personal.gender)],
      ['Marital status', titleCase(dto.personal.marital_status)],
    ]),
    contact: rows([
      ['Email', dto.contact.email],
      ['Phone', dto.contact.phone],
    ]),
    addresses: dto.contact.addresses
      .map((a) => ({
        label: `${titleCase(a.type) ?? 'Other'} address`,
        text: [a.line1, a.line2, a.city, a.state, a.pincode, a.country].filter(Boolean).join(', '),
      }))
      .filter((a) => a.text),
    emergencyContacts: dto.emergency_contacts
      .filter((c) => c.name || c.phone)
      .map((c) => ({ name: c.name || c.phone || '', relation: titleCase(c.relation), phone: c.phone, primary: c.primary })),
    bank: bank
      ? rows([
          ['Bank', bank.bank_name],
          ['Branch', bank.branch_name],
          ['IFSC', bank.ifsc],
          ['Account number', bank.account_masked],
          ['PAN', bank.pan_masked],
          ['Aadhaar', bank.aadhaar_masked],
          ['UAN', bank.uan_masked],
        ])
      : [],
  };
}
