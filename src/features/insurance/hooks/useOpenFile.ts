'use client';

import { useCallback, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import type { FileLink } from '../types/insurance.types';

/** Fetches a short-lived link and opens it in a new tab; the link is never kept. */
export function useOpenFile() {
  const [busy, setBusy] = useState<string | null>(null);
  const open = useCallback(async (key: string, fetchLink: () => Promise<FileLink>) => {
    // Open the tab first so the browser treats it as a click, then point it at the link.
    const tab = window.open('', '_blank');
    setBusy(key);
    try {
      const link = await fetchLink();
      if (tab) tab.location.href = link.url;
      else window.location.href = link.url;
    } catch (err) {
      tab?.close();
      showError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }, []);
  return { open, busy };
}
