/** Fixed values shared across the login flow. */

/** Screens the login card can show, in the order a user meets them. */
export type LoginStep =
  | 'remembered'
  | 'email'
  | 'accounts'
  | 'password'
  | 'superadmin-password'
  | 'otp'
  | 'account-otp'
  | 'verify'
  | 'forgot-email'
  | 'forgot-otp'
  | 'forgot-reset';

export type LoginTab = 'password' | 'otp';

export type QrStatus = 'pending' | 'scanned' | 'confirmed' | 'expired';

/** Steps that keep the password/OTP tab switcher and the QR panel visible. */
export const STEPS_WITH_TABS: readonly LoginStep[] = [
  'email',
  'password',
  'superadmin-password',
  'otp',
  'verify',
];

/** Landing route per backend role. Roles arrive in mixed case, so match loosely. */
export const ROLE_ROUTES: Record<string, string> = {
  superadmin: '/superadmin',
  orgadmin: '/org-admin',
  employee: '/employee',
};

export const DEFAULT_ROUTE = '/dashboard';

export function routeForRole(role?: string): string {
  return ROLE_ROUTES[(role || '').toLowerCase()] || DEFAULT_ROUTE;
}

export const STORAGE_KEYS = {
  token: 'token',
  rememberedAccounts: 'tt_remembered_accounts',
  /** v1 single-account key, migrated on first read then removed. */
  legacyRememberedAccount: 'tt_remembered_account',
} as const;

/** Keep the device list short; older entries fall off the end. */
export const REMEMBERED_LIMIT = 5;

/** Which input a validation message belongs under. */
export type FieldName = 'email' | 'mobile' | 'password' | 'otp';

export interface FieldError {
  field: FieldName;
  message: string;
}

/** Pragmatic shape check: something@something.tld, no spaces. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** Indian mobile numbers are 10 digits and never start with 0-5. */
export function isValidMobile(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  const phone10 = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(phone10);
}

export const OTP_LENGTH = 4;
export const FORGOT_OTP_LENGTH = 6;

export const QR = {
  /** Server expires a QR session after 5 minutes; mirror it on the client. */
  expiryMs: 5 * 60 * 1000,
  /** Fall back to polling only if the socket has not connected by then. */
  socketGraceMs: 2000,
  pollIntervalMs: 3000,
  deepLink: (token: string) => `teamtuned://qr-login?token=${token}`,
} as const;
