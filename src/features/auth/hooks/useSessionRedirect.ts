'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/userStore';
import { fetchSession } from '../api/auth.api';
import { toSessionSnapshot } from '../types/auth.mapper';
import { routeAfterLogin } from '@/config/routes';

export function useSessionRedirect() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = toSessionSnapshot(await fetchSession());
      if (cancelled) return;

      if (session.isAuthenticated && session.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.role || '',
          organizationId: session.user.organizationId,
        });
        router.replace(routeAfterLogin(session.role, session.nextStep));
        return;
      }
      setIsChecking(false);
    })();

    return () => { cancelled = true; };
  }, [router, setUser]);

  return isChecking;
}
