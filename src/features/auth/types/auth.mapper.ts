import type {
  AccountDto,
  AuthResultDto,
  CheckAccountsResponseDto,
  SessionResponseDto,
} from './auth.dto';
import type { Account, AuthOutcome, AuthenticatedUser, SessionSnapshot } from './auth.model';

export function toAccount(dto: AccountDto): Account {
  const userType = (dto.userType || '').toLowerCase();
  const fullName = dto.fullName || `${dto.firstName || ''} ${dto.lastName || ''}`.trim();
  return {
    id: dto.id,
    username: dto.username,
    email: dto.email,
    phone: dto.phone,
    displayName: fullName || dto.username || dto.email,
    userType,
    organizationId: dto.societyId,
    organizationName: dto.societyName || 'Account',
    status: dto.status,
    isSuperAdmin: userType === 'superadmin',
  };
}

export function toAccounts(dtos: AccountDto[] | undefined): Account[] {
  return (dtos || []).map(toAccount);
}

function toAuthenticatedUser(dto: AuthResultDto, fallbackName: string): AuthenticatedUser {
  const user = dto.user!;
  return {
    id: String(user.id),
    email: user.email,
    name: user.name || fallbackName || user.email,
    role: dto.role || '',
    organizationId: user.societyId,
    organizationName: dto.organization?.name,
    features: (dto.organization_features || []).map((f) => f.code),
  };
}

export function toAuthOutcome(dto: AuthResultDto, fallbackName = ''): AuthOutcome {
  if (dto.success && dto.user) {
    return {
      kind: 'authenticated',
      user: toAuthenticatedUser(dto, fallbackName),
      token: dto.token,
      raw: dto,
    };
  }
  if (dto.accounts && dto.accounts.length > 1) {
    return { kind: 'account-choice', accounts: toAccounts(dto.accounts) };
  }
  return { kind: 'failed', message: dto.message || dto.error || dto.detail || 'Login failed' };
}

export function toAccountLookup(dto: CheckAccountsResponseDto): {
  accounts: Account[];
  error?: string;
} {
  if (dto.error) return { accounts: [], error: dto.error };
  const list = dto.accounts?.length ? dto.accounts : dto.account ? [dto.account] : [];
  return { accounts: toAccounts(list) };
}

export function toSessionSnapshot(dto: SessionResponseDto): SessionSnapshot {
  if (!dto.authenticated || !dto.user) return { isAuthenticated: false };
  return {
    isAuthenticated: true,
    role: dto.role,
    user: {
      id: String(dto.user.id),
      email: dto.user.email,
      name: dto.user.name || '',
      organizationId: dto.user.societyId,
    },
  };
}
