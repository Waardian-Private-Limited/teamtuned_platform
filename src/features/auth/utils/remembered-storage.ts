import { readSecure, writeSecure } from '@/lib/auth/secure-storage';
import type { Account, RememberedAccount } from '../types/auth.model';
import { REMEMBERED_LIMIT, STORAGE_KEYS } from '../constants/auth.constants';

type LegacyEntry = { account?: Account; email?: string };

function normalize(list: RememberedAccount[]): RememberedAccount[] {
  return list
    .filter((r): r is RememberedAccount => Boolean(r?.account?.id))
    .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
    .slice(0, REMEMBERED_LIMIT);
}

async function migrateLegacyPlaintext(): Promise<RememberedAccount[] | undefined> {
  const legacyList = localStorage.getItem(STORAGE_KEYS.rememberedAccounts);
  const legacySingle = localStorage.getItem(STORAGE_KEYS.legacyRememberedAccount);
  if (!legacyList && !legacySingle) return undefined;

  let migrated: RememberedAccount[] = [];

  if (legacyList) {
    try {
      const parsed = JSON.parse(legacyList);
      if (Array.isArray(parsed)) {
        migrated = parsed
          .filter((r): r is { account?: Account; email?: string; lastUsedAt?: number } => Boolean(r?.account?.id))
          .map((r) => ({
            account: r.account as Account,
            email: r.email || (r.account as Account).email,
            method: 'password' as const,
            lastUsedAt: r.lastUsedAt || Date.now(),
          }));
      }
    } catch {
    }
    localStorage.removeItem(STORAGE_KEYS.rememberedAccounts);
  }

  if (legacySingle) {
    try {
      const parsed = JSON.parse(legacySingle) as LegacyEntry;
      if (parsed?.account?.id) {
        migrated = [
          {
            account: parsed.account,
            email: parsed.email || parsed.account.email,
            method: 'password',
            lastUsedAt: Date.now(),
          },
          ...migrated.filter((m) => m.account.id !== parsed.account!.id),
        ];
      }
    } catch {
    }
    localStorage.removeItem(STORAGE_KEYS.legacyRememberedAccount);
  }

  const result = normalize(migrated);
  if (result.length) {
    const envelope = await writeSecure(STORAGE_KEYS.rememberedAccounts, result);
    localStorage.setItem(STORAGE_KEYS.rememberedAccounts, envelope);
  }
  return result;
}

export async function readRemembered(): Promise<RememberedAccount[]> {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(STORAGE_KEYS.rememberedAccounts);
  if (!raw) {
    return (await migrateLegacyPlaintext()) || [];
  }

  if (!raw.startsWith('v2:')) {
    return (await migrateLegacyPlaintext()) || [];
  }

  const decrypted = await readSecure<RememberedAccount[]>(STORAGE_KEYS.rememberedAccounts, raw);
  if (!decrypted || !Array.isArray(decrypted)) {
    localStorage.removeItem(STORAGE_KEYS.rememberedAccounts);
    return [];
  }
  return normalize(decrypted);
}

export async function writeRemembered(list: RememberedAccount[]): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!list.length) {
    localStorage.removeItem(STORAGE_KEYS.rememberedAccounts);
    return;
  }
  const envelope = await writeSecure(STORAGE_KEYS.rememberedAccounts, normalize(list));
  localStorage.setItem(STORAGE_KEYS.rememberedAccounts, envelope);
}
