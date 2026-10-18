import { apiClient } from '@/lib/api/client';
import type { CategoryPreferenceDto, InboxPageDto, NotificationCategory, NotificationItemDto } from '../types';

const auth = { withAuth: true } as const;
const BASE = '/notifications';
const lang = { 'x-lang': 'en' };

export function getInbox(tab: 'new' | 'history', category: NotificationCategory | null, before?: number | null) {
  return apiClient<InboxPageDto>(BASE, { ...auth, headers: lang, params: { tab, category, before } });
}

export function getCounts() {
  return apiClient<{ unread: number; by_category: InboxPageDto['by_category'] }>(`${BASE}/counts`, auth);
}

export function markRead(target: { ids?: number[]; category?: NotificationCategory; all?: boolean }) {
  return apiClient<{ unread: number }>(`${BASE}/read`, { ...auth, method: 'POST', body: target });
}

/** Reads one item and returns it, so a link can open straight from a push. */
export function openItem(id: number) {
  return apiClient<{ item: NotificationItemDto; unread: number }>(`${BASE}/${id}/open`, { ...auth, method: 'POST', headers: lang });
}

export function registerDevice(token: string) {
  return apiClient<{ registered: boolean }>(`${BASE}/device`, { ...auth, method: 'PUT', body: { token, platform: 'web', lang: 'en' } });
}

export function unregisterDevice() {
  return apiClient<{ registered: boolean }>(`${BASE}/device`, { ...auth, method: 'DELETE' });
}

export function getPreferences() {
  return apiClient<{ preferences: CategoryPreferenceDto[] }>(`${BASE}/preferences`, auth);
}

export function savePreferences(preferences: CategoryPreferenceDto[]) {
  return apiClient<{ preferences: CategoryPreferenceDto[] }>(`${BASE}/preferences`, { ...auth, method: 'PUT', body: { preferences } });
}
