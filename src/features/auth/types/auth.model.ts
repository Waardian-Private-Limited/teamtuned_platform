export interface Account {
  id: string;
  username: string;
  email: string;
  phone: string;
  displayName: string;
  userType: string;
  organizationId: string;
  organizationName: string;
  status: string;
  isSuperAdmin: boolean;
}

export interface RememberedAccount {
  account: Account;
  email: string;
  phone?: string;
  method: 'password' | 'otp';
  lastUsedAt: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  features: string[];
}

export type AuthOutcome =
  | { kind: 'authenticated'; user: AuthenticatedUser; token?: string; raw: unknown }
  | { kind: 'account-choice'; accounts: Account[] }
  | { kind: 'failed'; message: string };

export interface SessionSnapshot {
  isAuthenticated: boolean;
  role?: string;
  user?: { id: string; email: string; name: string; organizationId?: string };
}
