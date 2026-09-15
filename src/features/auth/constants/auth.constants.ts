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

export const STEPS_WITH_TABS: readonly LoginStep[] = [
  'email',
  'password',
  'superadmin-password',
  'otp',
  'verify',
];

export const STORAGE_KEYS = {
  rememberedAccounts: 'tt_remembered_accounts',
  legacyRememberedAccount: 'tt_remembered_account',
} as const;

export const REMEMBERED_LIMIT = 5;

export type FieldName = 'email' | 'mobile' | 'password' | 'otp';

export interface FieldError {
  field: FieldName;
  message: string;
}

/**
 * The input a step is really about.
 *
 * Errors that arrive without a field — a rejected password, an expired code —
 * are shown on this input in red rather than in a banner above the form. Steps
 * absent from the map have no input of their own (account pickers), so their
 * errors fall back to inline text.
 */
export const STEP_PRIMARY_FIELD: Partial<Record<LoginStep, FieldName>> = {
  email: 'email',
  'forgot-email': 'email',
  password: 'password',
  'superadmin-password': 'password',
  'forgot-reset': 'password',
  otp: 'mobile',
  verify: 'otp',
  'forgot-otp': 'otp',
};

export const OTP_LENGTH = 4;
export const FORGOT_OTP_LENGTH = 6;
export const RESEND_COOLDOWN_SECONDS = 60;

export const QR = {
  expiryMs: 5 * 60 * 1000,
  socketGraceMs: 2000,
  pollIntervalMs: 3000,
  deepLink: (token: string) => `teamtuned://qr-login?token=${token}`,
} as const;
