import type { NamedRef, Position } from '../types/recruitment.model';
import { WORK_MODE_LABELS } from '../constants/recruitment.constants';

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** 1250000 → "₹12.5L"; small values stay full. */
export function formatMoneyShort(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  if (v >= 10000000) return `₹${trim(v / 10000000)}Cr`;
  if (v >= 100000) return `₹${trim(v / 100000)}L`;
  return `₹${inr.format(v)}`;
}

export function formatMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return `₹${inr.format(v)}`;
}

function trim(n: number) {
  return (Math.round(n * 10) / 10).toString();
}

export function formatRange(min: number | null, max: number | null, fmt: (n: number) => string, unit = ''): string {
  if (min === null && max === null) return '—';
  if (min !== null && max !== null) return min === max ? `${fmt(min)}${unit}` : `${fmt(min)}–${fmt(max)}${unit}`;
  if (min !== null) return `${fmt(min)}+${unit}`;
  return `Up to ${fmt(max as number)}${unit}`;
}

export function formatYears(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return `${v} ${v === 1 ? 'yr' : 'yrs'}`;
}

export function positionLocation(p: Pick<Position, 'site' | 'locationText' | 'workMode'>): string {
  const place = p.site?.name || p.locationText;
  const mode = WORK_MODE_LABELS[p.workMode];
  return place ? `${place} · ${mode}` : mode;
}

export function refName(r: NamedRef | null | undefined, fallback = '—') {
  return r?.name || fallback;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Open a URL that is fetched asynchronously without tripping the popup blocker. */
export async function openAsync(getUrl: () => Promise<string>): Promise<void> {
  const win = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  try {
    const url = await getUrl();
    if (win) {
      win.opener = null;
      win.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener');
    }
  } catch (err) {
    win?.close();
    throw err;
  }
}

/** "2/3 filled", or "4 hired · no limit" when openings is 0 (the position keeps hiring). */
export function openingsText(hired: number, openings: number): string {
  return openings > 0 ? `${hired}/${openings} filled` : `${hired} hired · no limit`;
}

/** A candidate-supplied link as an http(s) URL, or null (never javascript: or other schemes). */
export function safeHref(url: string | null | undefined) {
  const u = (url || '').trim();
  if (!u) return null;
  const withScheme = /^https?:\/\//i.test(u) ? u : `https://${u}`;
  try {
    const parsed = new URL(withScheme);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}
