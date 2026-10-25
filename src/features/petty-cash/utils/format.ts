import { orgDateOf } from '@/lib/datetime';
import { dateText } from '@/features/expense-bills/utils/format';

export { compactMoney, dateText, dateTimeText, fileSize, initials, money, parseDecimal, plural, signedMoney } from '@/features/expense-bills/utils/format';

/** The day of a UTC timestamp in the organization's time zone (`dateText` is for plain YYYY-MM-DD dates). */
export function dayText(iso: string | null | undefined): string {
  return iso ? dateText(orgDateOf(iso)) : '—';
}

/** How far below zero a wallet may go: 0 = not at all, null = no limit. */
export function walletRoom(w: { negativeAllowed: boolean; negativeLimit: number | null }): number | null {
  if (!w.negativeAllowed) return 0;
  return w.negativeLimit === null || w.negativeLimit <= 0 ? null : w.negativeLimit;
}

/** The wallet's below-zero rule in words. */
export function walletRoomText(w: { negativeAllowed: boolean; negativeLimit: number | null }, format: (v: number) => string): string {
  const room = walletRoom(w);
  if (room === 0) return 'Spending stops at zero';
  if (room === null) return 'Can go below zero (no limit)';
  return `Can go up to ${format(room)} below zero`;
}

/** Share of the float still in the wallet, 0–100 (0 when there is no float). */
export function floatPercent(balance: number, floatAmount: number): number {
  if (floatAmount <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((balance / floatAmount) * 100)));
}

/** "Site name" or "Company office", whichever owns the wallet. */
export function walletOwner(w: { site: { name: string } | null; company: { name: string } | null }): string {
  return w.site?.name || (w.company?.name ? `${w.company.name} office` : 'Company office');
}
