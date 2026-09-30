export type PtGender = 'all' | 'male' | 'female' | 'other';

export interface PtSlab {
  gender: PtGender;
  minGross: number;
  amount: number;
  specialAmount: number | null;
}

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const PT_GENDERS: { value: PtGender; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const toNumber = (v: unknown) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function ptGender(value: unknown): PtGender {
  const g = String(value || 'all').trim().toLowerCase();
  return PT_GENDERS.some((x) => x.value === g) ? (g as PtGender) : 'all';
}

export function ptSlabs(config: Record<string, unknown> | null | undefined): PtSlab[] {
  const c = config || {};
  if (Array.isArray(c.slabs) && c.slabs.length) {
    return (c.slabs as Record<string, unknown>[])
      .map((s) => ({ gender: ptGender(s.gender), minGross: toNumber(s.minGross) ?? 0, amount: toNumber(s.amount) ?? 0, specialAmount: toNumber(s.specialAmount) }))
      .sort((a, b) => a.minGross - b.minGross);
  }
  const monthly = toNumber(c.monthlyAmount);
  if (monthly === null) return [];
  return [{ gender: 'all', minGross: 0, amount: monthly, specialAmount: toNumber(c.februaryAmount) }];
}

export function ptSpecialMonth(config: Record<string, unknown> | null | undefined): number | null {
  const c = config || {};
  if (c.specialMonth !== undefined) {
    const m = toNumber(c.specialMonth);
    return m && m >= 1 && m <= 12 ? m : null;
  }
  return toNumber(c.februaryAmount) !== null ? 2 : null;
}

export function ptSlabFor(config: Record<string, unknown> | null | undefined, gross: number, gender?: string | null): PtSlab | null {
  const all = ptSlabs(config);
  const g = gender ? ptGender(gender) : 'all';
  const specific = g !== 'all' ? all.filter((s) => s.gender === g) : [];
  const pool = specific.length ? specific : all.filter((s) => s.gender === 'all');
  let match: PtSlab | null = null;
  for (const slab of pool) if (gross >= slab.minGross) match = slab;
  return match;
}
