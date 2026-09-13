'use client';

import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS, REMEMBERED_LIMIT } from '../constants/auth.constants';
import type { Account, RememberedAccount } from '../model/auth.model';

/**
 * "Remember me" for several accounts on one device — a shared laptop, or one
 * person who belongs to more than one organization.
 *
 * Stores a list, most recently used first. Nothing secret is kept: only the
 * account identity needed to skip the email lookup. Credentials are never
 * written to storage.
 */
export function useRememberedAccounts() {
  const [accounts, setAccounts] = useState<RememberedAccount[]>([]);
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    setAccounts(readRemembered());
    setIsRestored(true);
  }, []);

  const persist = useCallback((next: RememberedAccount[]) => {
    setAccounts(next);
    if (next.length) {
      localStorage.setItem(STORAGE_KEYS.rememberedAccounts, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEYS.rememberedAccounts);
    }
  }, []);

  /** Adds or refreshes an account and moves it to the front of the list. */
  const remember = useCallback((account: Account, email: string) => {
    const entry: RememberedAccount = { account, email, lastUsedAt: Date.now() };
    const rest = readRemembered().filter((r) => r.account.id !== account.id);
    persist([entry, ...rest].slice(0, REMEMBERED_LIMIT));
  }, [persist]);

  const forget = useCallback((accountId: string) => {
    persist(readRemembered().filter((r) => r.account.id !== accountId));
  }, [persist]);

  const forgetAll = useCallback(() => persist([]), [persist]);

  return { accounts, isRestored, remember, forget, forgetAll };
}

/** Reads and migrates storage, discarding anything that no longer parses. */
function readRemembered(): RememberedAccount[] {
  if (typeof window === 'undefined') return [];

  // v1 stored a single {account, email} object under a different key.
  const legacy = localStorage.getItem(STORAGE_KEYS.legacyRememberedAccount);
  if (legacy) {
    localStorage.removeItem(STORAGE_KEYS.legacyRememberedAccount);
    try {
      const parsed = JSON.parse(legacy) as { account?: Account; email?: string };
      if (parsed?.account?.id) {
        const migrated: RememberedAccount[] = [
          { account: parsed.account, email: parsed.email || parsed.account.email, lastUsedAt: Date.now() },
        ];
        localStorage.setItem(STORAGE_KEYS.rememberedAccounts, JSON.stringify(migrated));
        return migrated;
      }
    } catch {
      // Unparseable legacy entry — nothing worth migrating.
    }
  }

  const raw = localStorage.getItem(STORAGE_KEYS.rememberedAccounts);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('not a list');
    return parsed
      .filter((r): r is RememberedAccount => Boolean(r?.account?.id))
      .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
      .slice(0, REMEMBERED_LIMIT);
  } catch {
    localStorage.removeItem(STORAGE_KEYS.rememberedAccounts);
    return [];
  }
}
