import type { LeaveStatus, Session } from '../types/leave';

export const days = (n: number | null | undefined) => {
  if (n == null) return '–';
  const v = Math.round(Number(n) * 100) / 100;
  return `${v} d`;
};

export const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const range = (s: string, e: string) => (s === e ? fmtDate(s) : `${fmtDate(s)} – ${fmtDate(e)}`);

export const SESSION_LABEL: Record<Session, string> = { full: 'Full day', first_half: 'First half', second_half: 'Second half' };

export const STATUS_TONE: Record<LeaveStatus, 'active' | 'inactive' | 'neutral' | 'terminated'> = {
  Approved: 'active', Pending: 'neutral', Rejected: 'inactive', Cancelled: 'terminated', Expired: 'terminated',
};

export const ENTRY_LABEL: Record<string, string> = {
  opening: 'Yearly credit', credit: 'Credit', accrual: 'Monthly credit', carry_forward: 'Carried forward', debit: 'Leave taken', encash: 'Encashed',
  lapse: 'Lapsed', adjustment: 'Adjustment', reversal: 'Leave cancelled', recalc_delta: 'Policy change', hold: 'Reserved for request',
  hold_release: 'Request released', transfer_in: 'Moved in', transfer_out: 'Moved out',
};

export const todayIso = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
