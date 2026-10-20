import { messageOf } from '@/lib/api/errors';
import type { FileLinkDto } from '../types/payroll-setup.dto';

/**
 * Opens a private file from a short-lived link in a new tab. The tab is opened before the
 * request so the browser counts it as part of the click. Resolves to an error message, or
 * null when it opened.
 */
export async function openFileLink(fetchLink: () => Promise<FileLinkDto>): Promise<string | null> {
  const tab = window.open('', '_blank');
  try {
    const link = await fetchLink();
    if (tab) tab.location.href = link.url;
    else window.location.href = link.url;
    return null;
  } catch (err) {
    tab?.close();
    return messageOf(err);
  }
}
