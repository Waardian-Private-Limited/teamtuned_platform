'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { areaOfRole, linkFor } from '../linkFor';
import { markRead } from '../store/notificationStore';
import type { NotificationItemDto } from '../types';

/** Opens a notification: reads it, then goes to the page its screen key stands for. */
export function useOpenNotification(after?: () => void) {
  const router = useRouter();
  const { role } = useAuth();
  return useCallback(
    (item: NotificationItemDto) => {
      void markRead(item);
      after?.();
      router.push(linkFor(item.screen, item.params, areaOfRole(role)));
    },
    [router, role, after]
  );
}
