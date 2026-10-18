import type { DeviceEventKind, DevicePlatform } from '../types/employeeDevices.model';

export function platformLabel(platform: DevicePlatform): string {
  if (platform === 'android') return 'Android';
  if (platform === 'ios') return 'iPhone';
  if (platform === 'web') return 'Web';
  return 'Phone';
}

/** "just now", "5 min ago", "3 h ago", "2 d ago"; falls back to null past a month. */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const minutes = Math.max(0, Math.round((now - t) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days <= 30) return `${days} d ago`;
  return null;
}

/** "Web: 3 browsers" / "Web: 1 browser" / "Web: none". Web sign-ins are never limited. */
export function webSessionsLabel(count: number): string {
  if (!count) return 'Web: none';
  return `Web: ${count} browser${count === 1 ? '' : 's'}`;
}

export const EVENT_LABELS: Record<DeviceEventKind, string> = {
  registered: 'Phone registered',
  blocked: 'Sign-in blocked, waiting for HR',
  allowed: 'New phone allowed',
  reset: 'Registered phone reset',
  logout: 'Session logged out',
};
