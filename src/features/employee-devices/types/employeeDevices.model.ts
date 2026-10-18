export type DevicePlatform = 'android' | 'ios' | 'web' | 'unknown';

export interface RegisteredDevice {
  platform: DevicePlatform;
  name: string;
  boundAt: string | null;
}

export interface PendingDevice {
  platform: DevicePlatform;
  name: string;
  at: string;
}

export interface EmployeeDevice {
  employeeId: number;
  userId: number;
  name: string;
  code: string | null;
  department: string | null;
  phone: string | null;
  device: RegisteredDevice | null;
  singleDevice: boolean;
  /** Last seen in the app on a phone. */
  lastSeenAt: string | null;
  phoneSessions: number;
  /** Browsers signed in. Web sign-ins are never limited. */
  webSessions: number;
  webLastSeenAt: string | null;
  pendingDevice: PendingDevice | null;
}

export interface DeviceSummary {
  registered: number;
  pending: number;
  none: number;
}

export interface EmployeeDeviceListResult {
  employees: EmployeeDevice[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  summary: DeviceSummary;
}

export interface DeviceSession {
  id: number;
  type: 'mobile' | 'web';
  name: string;
  ip: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
  isRegisteredPhone: boolean;
}

export type DeviceEventKind = 'registered' | 'blocked' | 'reset' | 'allowed' | 'logout';

export interface DeviceEvent {
  id: number;
  event: DeviceEventKind;
  deviceName: string | null;
  platform: DevicePlatform;
  actorName: string | null;
  at: string;
}

export interface EmployeeDeviceDetail extends EmployeeDevice {
  sessions: { phone: DeviceSession[]; web: DeviceSession[] };
  events: DeviceEvent[];
}
