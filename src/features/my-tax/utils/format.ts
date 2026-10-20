import { formatDate, orgDateOf, orgToday } from '@/lib/datetime';
import type { TaxWindow } from '../types/myTax.model';

/** Whole rupees, Indian grouping: ₹1,23,456. */
export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

/** '2026-27' for a financial year; the server already sends it this way. */
export function fyLabel(fy: string): string {
  return `FY ${fy}`;
}

/** A server timestamp as the day it was in the org, e.g. "12 Jun 2026". */
export function dayOf(iso: string | null | undefined): string {
  return iso ? formatDate(orgDateOf(iso)) : '—';
}

/** "Proof upload opens on 1 Jan 2027" / "... closed on 31 Mar 2027"; null while open. */
export function windowLine(what: string, w: TaxWindow): string | null {
  if (w.open) return null;
  if (w.opensOn && orgToday() < w.opensOn) return `${what} opens on ${formatDate(w.opensOn)}`;
  return w.closesOn ? `${what} closed on ${formatDate(w.closesOn)}` : `${what} is closed`;
}

/** 5 MB, the server's limit for one proof file. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
