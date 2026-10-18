'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { openItem } from '@/features/notifications/api/notifications.api';
import { areaOfRole, linkFor, type Area } from '@/features/notifications/linkFor';
import { refreshCounts } from '@/features/notifications/store/notificationStore';
import { useAuth } from '@/context/AuthContext';

/**
 * Where a browser push lands. It reads the notification and sends the person to the page it stands for,
 * so the service worker only needs to know this one address. Signed out, it goes to sign-in first and the
 * notification stays unread.
 */
export default function OpenNotificationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { role, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    const area: Area = areaOfRole(role);
    openItem(Number(id))
      .then(({ item }) => {
        void refreshCounts({ announce: false });
        router.replace(linkFor(item.screen, item.params, area));
      })
      .catch(() => router.replace(`/${area}/notifications`));
  }, [id, role, isAuthenticated, loading, router]);

  return <div className="flex min-h-screen items-center justify-center text-sm text-fg-muted">Opening…</div>;
}
