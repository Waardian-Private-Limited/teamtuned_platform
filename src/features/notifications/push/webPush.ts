import { FIREBASE, FIREBASE_CONFIGURED } from '@/config/env';
import * as api from '../api/notifications.api';

/**
 * Browser push through Firebase. The service worker (public/firebase-messaging-sw.js) shows notifications while
 * the tab is closed or hidden and opens /n/<id> on click; this file asks permission, gets the token the server
 * pushes to, and reports pushes that arrive while the tab is open.
 */
export const pushSupported = () =>
  typeof window !== 'undefined' && FIREBASE_CONFIGURED && 'serviceWorker' in navigator && 'Notification' in window;

export const pushPermission = (): NotificationPermission | 'unsupported' => (pushSupported() ? Notification.permission : 'unsupported');

async function registerWorker() {
  const config = new URLSearchParams({
    apiKey: FIREBASE.apiKey ?? '',
    authDomain: FIREBASE.authDomain ?? '',
    projectId: FIREBASE.projectId ?? '',
    messagingSenderId: FIREBASE.messagingSenderId ?? '',
    appId: FIREBASE.appId ?? '',
  });
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${config.toString()}`);
}

let registeredToken: string | null = null;

/** Gets this browser's token and tells the server. Asks permission only when [ask] is true (after a click). */
export async function enablePush({ ask }: { ask: boolean }): Promise<NotificationPermission | 'unsupported'> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'default' && ask) await Notification.requestPermission();
  if (Notification.permission !== 'granted') return Notification.permission;
  const [{ getApp, getApps, initializeApp }, { getMessaging, getToken }] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  const app = getApps().length ? getApp() : initializeApp({ apiKey: FIREBASE.apiKey, authDomain: FIREBASE.authDomain, projectId: FIREBASE.projectId, messagingSenderId: FIREBASE.messagingSenderId, appId: FIREBASE.appId });
  const token = await getToken(getMessaging(app), { vapidKey: FIREBASE.vapidKey, serviceWorkerRegistration: await registerWorker() });
  if (token && token !== registeredToken) {
    await api.registerDevice(token);
    registeredToken = token;
  }
  return 'granted';
}

/** Calls [handler] for a push that arrives while this tab is open. Returns the stop function. */
export async function listenForPush(handler: (payload: { title?: string; body?: string; itemId?: number }) => void): Promise<() => void> {
  if (!pushSupported() || Notification.permission !== 'granted') return () => undefined;
  const [{ getApp, getApps, initializeApp }, { getMessaging, onMessage }] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  const app = getApps().length ? getApp() : initializeApp({ apiKey: FIREBASE.apiKey, projectId: FIREBASE.projectId, messagingSenderId: FIREBASE.messagingSenderId, appId: FIREBASE.appId });
  return onMessage(getMessaging(app), (m) => handler({ title: m.notification?.title, body: m.notification?.body, itemId: Number(m.data?.item_id) || undefined }));
}

/** Signing out: the server forgets this browser, so nothing is pushed to the next person on it. */
export async function disablePush() {
  registeredToken = null;
  try {
    await api.unregisterDevice();
  } catch {
    // the session is ending anyway
  }
}
