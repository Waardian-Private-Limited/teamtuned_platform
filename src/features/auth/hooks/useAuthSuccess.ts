'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/userStore';
import { useAuth } from '@/providers/auth-provider';
import { setToken } from '@/lib/auth/session';
import { routeForRole } from '@/config/routes';
import type { AuthenticatedUser } from '../types/auth.model';

export function useAuthSuccess() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const { setAuthState } = useAuth();

  type SessionPayload = Parameters<typeof setAuthState>[0];

  return useCallback(
    (user: AuthenticatedUser, token: string | undefined, raw: unknown) => {
      if (token) setToken(token);
      setUser({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        societyId: user.organizationId,
        features: user.features,
      });
      setAuthState(raw as SessionPayload);
      router.push(routeForRole(user.role));
    },
    [router, setAuthState, setUser]
  );
}
