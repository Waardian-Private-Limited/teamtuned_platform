// Licence limits a super admin sets per organization. The backend sends this on the employee and
// wallet lists; `limit` and `available` are null when the organization has no limit.
export interface LicenseUsageDto {
  limit: number | null;
  used: number;
  available: number | null;
}

export type LicenseKind = 'employees' | 'wallets';

const FULL: Record<LicenseKind, (limit: number) => string> = {
  employees: (limit) =>
    `All ${limit} employee licences are in use. Make an employee inactive to add someone new, or ask TeamTuned for more licences.`,
  wallets: (limit) =>
    `All ${limit} wallet licences are in use. Close a wallet to open a new one, or ask TeamTuned for more licences.`,
};

export const isLicenseFull = (usage?: LicenseUsageDto | null) => usage?.available === 0;

/** The message to show when no seat is left, or '' when there is room or no limit. */
export function licenseFullMessage(kind: LicenseKind, usage?: LicenseUsageDto | null): string {
  return usage && usage.limit !== null && isLicenseFull(usage) ? FULL[kind](usage.limit) : '';
}

/** "48 / 50 licences", or '' when the organization has no limit. */
export function licenseCountLabel(usage?: LicenseUsageDto | null): string {
  return usage && usage.limit !== null ? `${usage.used} / ${usage.limit} licences` : '';
}
