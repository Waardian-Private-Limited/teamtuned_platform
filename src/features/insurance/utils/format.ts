export function money(value: number): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const DAY = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** 'YYYY-MM-DD' as '17 Oct 2026', without shifting by the browser's time zone. */
export function day(iso: string | null | undefined): string {
  return iso ? DAY.format(new Date(`${iso}T00:00:00Z`)) : '—';
}

const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export function monthLabel(key: string): string {
  return MONTH.format(new Date(`${key}-01T00:00:00Z`));
}

export function ageOf(dob: string | null): string {
  if (!dob) return '';
  const born = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  let years = now.getUTCFullYear() - born.getUTCFullYear();
  if (now.getUTCMonth() < born.getUTCMonth() || (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() < born.getUTCDate())) years -= 1;
  return years >= 0 ? `${years} yrs` : '';
}

export function parseAmount(raw: string): string {
  return raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export { MONTH_NAMES };

export function recoveryText(mode: string, months: number, calendarMonths: number[] = []): string {
  if (mode === 'none') return 'Company pays all';
  if (mode === 'one_time') return 'One time';
  const when = calendarMonths.length ? ` in ${calendarMonths.map((m) => MONTH_NAMES[m - 1]).join(', ')}` : '';
  if (mode === 'monthly') return `Monthly${when}`;
  return `${months} installments${when}`;
}
