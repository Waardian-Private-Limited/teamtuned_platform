'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/userStore';
import { useAuth } from '@/context/AuthContext';
import { STORAGE_KEYS, routeForRole } from '../constants/auth.constants';
import type { AuthenticatedUser } from '../model/auth.model';

/**
 * The one path a successful login takes, whichever flow produced it:
 * persist the token, populate both auth stores, then route by role.
 */
export function useAuthSuccess() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const { setAuthState } = useAuth();

  type SessionPayload = Parameters<typeof setAuthState>[0];

  return useCallback(
    (user: AuthenticatedUser, token: string | undefined, raw: unknown) => {
      if (token) localStorage.setItem(STORAGE_KEYS.token, token);
      setUser({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        societyId: user.organizationId,
        features: user.features,
      });
      // The raw login response doubles as a session payload for AuthContext.
      setAuthState(raw as SessionPayload);
      router.push(routeForRole(user.role));
    },
    [router, setAuthState, setUser]
  );
}
