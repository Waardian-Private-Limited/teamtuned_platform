'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Account, RememberedAccount } from '../types/auth.model';
import { readRemembered, writeRemembered } from '../utils/remembered-storage';
import { REMEMBERED_LIMIT } from '../constants/auth.constants';

export function useRememberedAccounts() {
  const [accounts, setAccounts] = useState<RememberedAccount[]>([]);
  const [isRestored, setIsRestored] = useState(false);
  const accountsRef = useRef<RememberedAccount[]>([]);

  useEffect(() => {
    let cancelled = false;
    readRemembered().then((list) => {
      if (cancelled) return;
      accountsRef.current = list;
      setAccounts(list);
      setIsRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: RememberedAccount[]) => {
    accountsRef.current = next;
    setAccounts(next);
    writeRemembered(next).catch(() => {});
  }, []);

  const remember = useCallback(
    (account: Account, email: string, method: 'password' | 'otp', phone?: string) => {
      const entry: RememberedAccount = { account, email, phone, method, lastUsedAt: Date.now() };
      const rest = accountsRef.current.filter((r) => r.account.id !== account.id);
      persist([entry, ...rest].slice(0, REMEMBERED_LIMIT));
    },
    [persist]
  );

  const forget = useCallback(
    (accountId: string) => {
      const next = accountsRef.current.filter((r) => r.account.id !== accountId);
      persist(next);
      return next;
    },
    [persist]
  );

  const forgetAll = useCallback(() => persist([]), [persist]);

  return { accounts, isRestored, remember, forget, forgetAll };
}
