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
export const timeText = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-');
export const todayInput = () => new Date().toLocaleDateString('en-CA');
