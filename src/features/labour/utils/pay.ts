import { PAY_BASIS_LABEL } from '../constants/labour.constants';
import type { HajriSlab, PayBasis } from '../types/labour.types';
import { money } from './format';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Hajri units the way a site writes them: ½, 1, 1½, ¼, 2 (the PDFs use the same characters). */
export function hajriLabel(units: number | null | undefined): string {
  const n = Number(units) || 0;
  const whole = Math.floor(n);
  const frac = round2(n - whole);
  const part = ({ 0.25: '¼', 0.5: '½', 0.75: '¾' } as Record<number, string>)[frac] || (frac ? String(frac).slice(1) : '');
  if (!whole && part) return part;
  return `${whole}${part}`;
}

/** Units for worked minutes: the last slab whose minHours the minutes reach (below the first slab = 0). */
export function hajriFor(minutes: number, slabs: HajriSlab[]): number {
  let units = 0;
  for (const s of [...slabs].sort((a, b) => a.minHours - b.minHours)) if (minutes >= s.minHours * 60) units = s.units;
  return units;
}

const hrs = (h: number) => `${Number.isInteger(h) ? h : round2(h)} h`;

/** "½ from 4 h · 1 from 8 h · 1½ from 12 h" (slabs worth nothing are left out). */
export function slabSummary(slabs: HajriSlab[] | null | undefined, sep = ' · '): string {
  return (slabs || []).filter((s) => s.units > 0).map((s) => `${hajriLabel(s.units)} from ${hrs(s.minHours)}`).join(sep);
}

export const basisLabel = (b: string | null | undefined) => (b ? PAY_BASIS_LABEL[b] || b : 'No rate');

/** One line for a rate row: "Hajri ₹900 per hajri", "₹80 / hr day · ₹90 night · ₹120 OT", "Paid from the measurement book". */
export function rateLine(r: { payBasis?: PayBasis | null; dayRate?: number; nightRate?: number; overtimeRate?: number; hajriRate?: number } | null | undefined): string {
  if (!r) return 'No rate';
  const basis = r.payBasis || 'hourly';
  if (basis === 'hajri') return `Hajri ${money(r.hajriRate)} per hajri`;
  if (basis === 'measurement') return 'Paid from the measurement book';
  return `${money(r.dayRate)}/hr day · ${money(r.nightRate)} night · ${money(r.overtimeRate)} OT`;
}

/** Valid hajri units: 0 to 4 in steps of 0.25. */
export const isHajriUnits = (v: number) => Number.isFinite(v) && v >= 0 && v <= 4 && Math.abs(v * 4 - Math.round(v * 4)) < 1e-9;

/** Client copy of the server's slab rules (`hajri.slabs`); returns the first problem or ''. */
export function slabProblem(slabs: HajriSlab[]): string {
  if (slabs.length < 1 || slabs.length > 10) return 'Keep between 1 and 10 slabs.';
  for (let i = 0; i < slabs.length; i += 1) {
    const s = slabs[i];
    if (!Number.isFinite(s.minHours) || s.minHours < 0 || s.minHours > 24) return `Slab ${i + 1}: hours must be from 0 to 24.`;
    if (!isHajriUnits(s.units)) return `Slab ${i + 1}: units must be from 0 to 4 in steps of 0.25 (e.g. 0.5, 1.5).`;
    if (i > 0 && s.minHours <= slabs[i - 1].minHours) return `Slab ${i + 1}: hours must be more than the slab above.`;
    if (i > 0 && s.units < slabs[i - 1].units) return `Slab ${i + 1}: units cannot go down as hours go up.`;
  }
  return '';
}

export const qty = (n: number | null | undefined) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
};
