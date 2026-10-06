import type { SectionNode } from '@/features/policies/components/editor/form/schemaTypes';

export type TrackingSectionKey =
  | 'tracking'
  | 'geofence'
  | 'security'
  | 'visits';

export interface TrackingSectionMeta {
  value: TrackingSectionKey;
  label: string;
  description: string;
  schemaKeys: string[];
}

export const TRACKING_SECTIONS: TrackingSectionMeta[] = [
  {
    value: 'tracking',
    label: 'Tracking & GPS',
    description: 'Shift window, off days, GPS accuracy & battery intervals',
    schemaKeys: ['window', 'sampling'],
  },
  {
    value: 'geofence',
    label: 'Sites & Geofence',
    description: 'Site boundaries, exit buffer, auto break & check-in on arrival',
    schemaKeys: ['geofence', 'away', 'autoCheckIn'],
  },
  {
    value: 'security',
    label: 'Device & Security',
    description: 'GPS turned off grace, silent phone pings, fake GPS protection & privacy',
    schemaKeys: ['locationOff', 'signalLost', 'integrity', 'privacy'],
  },
  {
    value: 'visits',
    label: 'Field Visits',
    description: 'Work travel tracking, odometer photos, mileage limits & vehicle allowance',
    schemaKeys: ['visits'],
  },
];

export type FullTrackingSchema = Record<string, SectionNode>;
