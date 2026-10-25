export { money, monthLabel, thisMonth, shiftMonth } from '@/features/salary-slips/utils/format';
export { compactMoney, dateText, dateTimeText, fileSize, plural, parseAmount } from '@/features/salary-advance/utils/format';

/** Signed amount with an explicit sign for ledger rows: +₹500 / −₹200. */
export function signedMoney(n: number, format: (v: number) => string) {
  if (!n) return format(0);
  return n > 0 ? `+${format(n)}` : format(n);
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Keeps digits and one dot, at most two decimals. */
export function parseDecimal(raw: string) {
  const clean = raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  const [whole, frac] = clean.split('.');
  return frac !== undefined ? `${whole}.${frac.slice(0, 2)}` : whole;
}
