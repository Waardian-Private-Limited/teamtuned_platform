import { addMonths, formatDate, formatMonth, orgToday } from '@/lib/datetime';

const MONEY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const MONEY_EXACT = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function money(v: number | null | undefined, exact = false) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return exact ? MONEY_EXACT.format(v) : MONEY.format(v);
}

export function days(v: number | null | undefined) {
  if (v === null || v === undefined) return '—';
  return `${Math.round(v * 100) / 100}`;
}

export function dateText(v: string | null | undefined) {
  return formatDate(v ? v.slice(0, 10) : null, 'medium');
}

export function shortDate(v: string | null | undefined) {
  return formatDate(v ? v.slice(0, 10) : null, 'short');
}

export const monthText = (m: string) => formatMonth(m);
export const shiftMonth = (m: string, delta: number) => addMonths(m, delta);
export const thisMonth = () => orgToday().slice(0, 7);
export const today = () => orgToday();

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function minutesText(v: number) {
  return `${Math.round(v).toLocaleString('en-IN')} min`;
}

export function lateDeductionTip(ld: { days: number; chargeableMinutes: number; freeMinutes: number; amount: number }) {
  const unit = ld.days === 1 ? 'day' : 'days';
  return `Late minutes deduction: ${minutesText(ld.chargeableMinutes)} chargeable (${minutesText(ld.freeMinutes)} free) → ${days(ld.days)} ${unit}, ${money(ld.amount)}`;
}

const NAV_KEY = 'tt-payroll-run-nav';

export function rememberOrder(runId: number, employeeIds: number[]) {
  try {
    sessionStorage.setItem(`${NAV_KEY}-${runId}`, JSON.stringify(employeeIds));
  } catch {}
}

export function recallOrder(runId: number): number[] {
  try {
    const raw = sessionStorage.getItem(`${NAV_KEY}-${runId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}
