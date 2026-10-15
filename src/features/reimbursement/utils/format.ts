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

/** How far below zero a wallet may go: 0 = not at all, null = no limit. */
export function walletRoom(w: { negativeAllowed: boolean; negativeLimit: number | null }): number | null {
  if (!w.negativeAllowed) return 0;
  return w.negativeLimit === null || w.negativeLimit <= 0 ? null : w.negativeLimit;
}

/** The policy's below-zero rule in words. */
export function walletRoomText(w: { negativeAllowed: boolean; negativeLimit: number | null }, format: (v: number) => string): string {
  const room = walletRoom(w);
  if (room === 0) return 'Spending stops at zero';
  if (room === null) return 'Can go below zero (no limit)';
  return `Can go up to ${format(room)} below zero`;
}

/** The "spent beyond the balance" line, or null when the balance is not below zero. */
export function belowZeroText(belowZero: number, format: (v: number) => string): string | null {
  return belowZero > 0 ? `${format(belowZero)} spent beyond the balance — the next top-up covers it` : null;
}
