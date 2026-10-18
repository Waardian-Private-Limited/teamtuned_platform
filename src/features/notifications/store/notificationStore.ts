import { useSyncExternalStore } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/notifications.api';
import type { CategoryPreferenceDto, NotificationCategory, NotificationItemDto } from '../types';
import { playChime } from './chime';

/**
 * The web inbox. One store for the whole page: the bell, its menu and the full page all read the same
 * numbers and lists, so reading something in one place changes it everywhere at once. No sockets: the unread
 * count refreshes when the tab comes back, on a slow timer, and when a push arrives.
 */
export interface NotificationState {
  unread: number;
  byCategory: Partial<Record<NotificationCategory, number>>;
  category: NotificationCategory | null;
  fresh: NotificationItemDto[];
  freshLoading: boolean;
  freshError: string | null;
  history: NotificationItemDto[];
  historyLoading: boolean;
  historyMore: boolean;
  historyNext: number | null;
  historyError: string | null;
  preferences: CategoryPreferenceDto[];
}

const POLL_MS = 60_000;

let state: NotificationState = {
  unread: 0, byCategory: {}, category: null,
  fresh: [], freshLoading: false, freshError: null,
  history: [], historyLoading: false, historyMore: false, historyNext: null, historyError: null,
  preferences: [],
};

const listeners = new Set<() => void>();
let counted = false;
let generation = 0;
let onArrive: ((count: number) => void | Promise<void>) | null = null;

function set(patch: Partial<NotificationState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const getNotificationState = () => state;

/** False only when the person turned sound off for every category that pushes. */
export const soundAllowed = () => state.preferences.length === 0 || state.preferences.some((p) => p.push && p.sound);

/** Called with how many new notifications showed up since the last count, so the UI can toast them. */
export function onNewNotifications(fn: ((count: number) => void | Promise<void>) | null) {
  onArrive = fn;
}

export { playChime };

export async function refreshCounts({ announce = true }: { announce?: boolean } = {}) {
  const gen = generation;
  try {
    const next = await api.getCounts();
    if (gen !== generation) return;
    const grew = counted && next.unread > state.unread;
    const added = next.unread - state.unread;
    counted = true;
    set({ unread: next.unread, byCategory: next.by_category });
    if (grew && announce) {
      if (soundAllowed()) playChime();
      onArrive?.(added);
    }
  } catch {
    // the badge keeps its last value
  }
}

export async function loadFresh({ silent = false }: { silent?: boolean } = {}) {
  const gen = generation;
  if (!silent) set({ freshLoading: true, freshError: null });
  try {
    const page = await api.getInbox('new', state.category);
    if (gen !== generation) return;
    set({ fresh: page.items, unread: page.unread, byCategory: page.by_category, freshError: null });
  } catch (e) {
    if (gen === generation && !silent) set({ freshError: messageOf(e) });
  } finally {
    if (gen === generation) set({ freshLoading: false });
  }
}

export async function loadHistory() {
  const gen = generation;
  set({ historyLoading: true, historyError: null });
  try {
    const page = await api.getInbox('history', state.category);
    if (gen !== generation) return;
    set({ history: page.items, historyNext: page.next_before });
  } catch (e) {
    if (gen === generation) set({ historyError: messageOf(e) });
  } finally {
    if (gen === generation) set({ historyLoading: false });
  }
}

export async function loadMoreHistory() {
  const next = state.historyNext;
  if (next === null || state.historyMore || state.historyLoading) return;
  const gen = generation;
  set({ historyMore: true });
  try {
    const page = await api.getInbox('history', state.category, next);
    if (gen !== generation) return;
    set({ history: [...state.history, ...page.items], historyNext: page.next_before });
  } catch (e) {
    if (gen === generation) set({ historyError: messageOf(e) });
  } finally {
    if (gen === generation) set({ historyMore: false });
  }
}

export const refreshAll = () => Promise.all([loadFresh(), loadHistory()]);

export async function setCategory(category: NotificationCategory | null) {
  if (state.category === category) return;
  set({ category });
  await refreshAll();
}

/** Read it: out of New, into History, badge down; the server is told in the background. */
export async function markRead(item: NotificationItemDto) {
  if (item.read) return;
  set({
    fresh: state.fresh.filter((e) => e.id !== item.id),
    history: [{ ...item, read: true }, ...state.history],
    unread: Math.max(0, state.unread - 1),
  });
  try {
    const res = await api.markRead({ ids: [item.id] });
    set({ unread: res.unread });
  } catch {
    void refreshCounts({ announce: false });
  }
}

export async function markAllRead() {
  set({ history: [...state.fresh.map((e) => ({ ...e, read: true })), ...state.history], fresh: [] });
  try {
    await api.markRead(state.category ? { category: state.category } : { all: true });
  } catch {
    // the lists below show the truth
  }
  await refreshAll();
}

export async function loadPreferences() {
  const res = await api.getPreferences();
  set({ preferences: res.preferences });
}

export async function setPreference(next: CategoryPreferenceDto) {
  const before = state.preferences;
  set({ preferences: before.map((p) => (p.category === next.category ? next : p)) });
  try {
    const res = await api.savePreferences([next]);
    set({ preferences: res.preferences });
  } catch (e) {
    set({ preferences: before });
    throw e;
  }
}

/** Sign-out: nothing of this person stays for the next one. */
export function resetNotifications() {
  generation += 1;
  counted = false;
  state = { ...state, unread: 0, byCategory: {}, category: null, fresh: [], history: [], historyNext: null, preferences: [] };
  listeners.forEach((l) => l());
}

// ── live updates ─────────────────────────────────────────────────────────────

let users = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function onVisible() {
  if (document.visibilityState === 'visible') void refreshCounts();
}

/** Starts refreshing while at least one component is using the store. Returns the stop function. */
export function startLive(): () => void {
  users += 1;
  if (users === 1) {
    void refreshCounts({ announce: false });
    void loadPreferences().catch(() => undefined);
    timer = setInterval(() => { if (document.visibilityState === 'visible') void refreshCounts(); }, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
  }
  return () => {
    users -= 1;
    if (users === 0) {
      if (timer) clearInterval(timer);
      timer = null;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    }
  };
}

export function useNotificationState(): NotificationState {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => state,
    () => state
  );
}
