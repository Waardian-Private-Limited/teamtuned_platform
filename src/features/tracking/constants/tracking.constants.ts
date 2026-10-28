import { formatTime, orgToday } from '@/lib/datetime';
import type { TrackingState } from '../types/tracking.dto';

export const TRACKING_PERMISSIONS = {
  VIEW: 'TRACKING_VIEW',
  POLICY: 'TRACKING_POLICY_MANAGE',
  ASSIGN: 'TRACKING_ASSIGN',
  TRIP_REVIEW: 'TRACKING_TRIP_REVIEW',
} as const;

// Free vector tiles, no key: the light grey style matches the monochrome UI.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
export const LIVE_POLL_MS = 20_000;
export const PAGE_SIZE = 50;

export const STATE_LABEL: Record<TrackingState, string> = {
  moving: 'Moving',
  stationary: 'Standing still',
  on_site: 'On site',
  off_site: 'Away from site',
  on_break: 'On break',
  on_trip: 'Field visit',
  gps_off: 'Location off',
  signal_lost: 'Signal lost',
  stopped: 'Not tracking',
};

// Ink for normal states; colour only where something needs attention.
export const STATE_COLOR: Record<TrackingState, string> = {
  moving: '#111111',
  stationary: '#111111',
  on_site: '#111111',
  on_break: '#6b7280',
  on_trip: '#111111',
  off_site: '#b54708',
  gps_off: '#d92d20',
  signal_lost: '#d92d20',
  stopped: '#9ca3af',
};

export const ATTENTION: TrackingState[] = ['off_site', 'gps_off', 'signal_lost'];

export const minutesText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
export const kmText = (meters: number) => `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
export const timeText = (iso: string | null | undefined, tz?: string | null) => (iso ? formatTime(iso, tz) : '-');
export const todayInput = () => orgToday();

// States that claim the phone is reporting right now; a pin older than this in one of them is stale.
export const NOT_LIVE: TrackingState[] = ['gps_off', 'signal_lost', 'stopped'];
export const STALE_FIX_MS = 15 * 60_000;

// Two route points further apart than this are not joined by a line (no track in between).
export const ROUTE_GAP_MS = 10 * 60_000;

export const DEVICE_EVENT_LABEL: Record<string, string> = {
  gps_off: 'Location switched off', gps_on: 'Location switched on', permission_downgraded: 'Location permission removed', permission_restored: 'Location permission given',
  offline: 'Internet off (recording continues)', online: 'Internet back', boot: 'Phone restarted', shutdown: 'Phone switched off',
  recorder_started: 'Recording started', recorder_stopped: 'Recording stopped', mock_detected: 'Fake location app detected', time_tamper: 'Phone clock changed',
  low_battery: 'Battery low', power_save_on: 'Battery saver on', power_save_off: 'Battery saver off',
  tracking_stopped: 'Tracking stopped: left the site',
  app_terminated: 'App closed by the employee', recorder_killed: 'Phone stopped the app (battery or autostart setting)', relaunched: 'Recording resumed after the app was closed',
  precise_off: 'Precise location turned off', precise_on: 'Precise location turned on',
  batch_dropped: 'Phone discarded locations the server refused', queue_trimmed: 'Phone storage full: oldest locations deleted',
};

// Device events worth flagging on the live board; recoveries (gps_on, precise_on, ...) are not.
const HEALTH_PROBLEMS = new Set(['gps_off', 'permission_downgraded', 'precise_off', 'mock_detected', 'time_tamper', 'low_battery', 'power_save_on', 'shutdown', 'app_terminated', 'recorder_killed', 'recorder_stopped', 'batch_dropped', 'queue_trimmed']);

export function healthText(health: { kind: string; detail: string | null } | null | undefined): string | null {
  if (!health || !HEALTH_PROBLEMS.has(health.kind)) return null;
  if (health.kind === 'permission_downgraded') return health.detail === 'when_in_use' ? 'Location allowed only while the app is open' : 'Location permission denied';
  if (health.kind === 'precise_off') return 'Approximate location only';
  return DEVICE_EVENT_LABEL[health.kind] ?? health.kind.replaceAll('_', ' ');
}
