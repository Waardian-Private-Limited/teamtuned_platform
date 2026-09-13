/** Domain models the login UI works with. Free of any backend naming. */

export interface Account {
  id: string;
  username: string;
  email: string;
  phone: string;
  /** Lowercased so callers never repeat a case-insensitive comparison. */
  userType: string;
  organizationId: string;
  organizationName: string;
  status: string;
  isSuperAdmin: boolean;
}

/** An account kept on this device so the email lookup can be skipped. */
export interface RememberedAccount {
  account: Account;
  email: string;
  lastUsedAt: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  features: string[];
}

/** Normalized outcome of any login attempt, whatever endpoint produced it. */
export type AuthOutcome =
  | { kind: 'authenticated'; user: AuthenticatedUser; token?: string; raw: unknown }
  | { kind: 'account-choice'; accounts: Account[] }
  | { kind: 'failed'; message: string };

export interface SessionSnapshot {
  isAuthenticated: boolean;
  role?: string;
  user?: { id: string; email: string; name: string; organizationId?: string };
}
