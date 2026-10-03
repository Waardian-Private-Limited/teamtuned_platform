'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { setToken } from '@/lib/auth/session';
import { showError, showInfo } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { EMPLOYEE_DASHBOARD_ROUTE } from '../constants/routes';
import * as api from '../api/employee-onboarding.api';

/**
 * Swaps the onboarding-scoped web token for a full one once HR has approved,
 * reloads the session context, then opens the dashboard.
 */
export function useProceedToDashboard() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [busy, setBusy] = useState(false);

  const proceed = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api.upgradeSession();
      if (!res.token) {
        showInfo('Your account is not ready yet. Please check status again.');
        return;
      }
      setToken(res.token);
      await refreshSession();
      router.replace(EMPLOYEE_DASHBOARD_ROUTE);
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }, [refreshSession, router]);

  return { proceed, busy };
}
