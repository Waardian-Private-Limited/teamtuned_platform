// Wire shapes returned by /employee-devices (backend modules/employee-devices).

export type DevicePlatformDto = 'android' | 'ios' | string | null;

export interface RegisteredDeviceDto {
  platform: DevicePlatformDto;
  name: string | null;
  boundAt: string | null;
}

export interface PendingDeviceDto {
  name: string | null;
  platform: DevicePlatformDto;
  at: string;
}

export interface EmployeeDeviceDto {
  employeeId: number;
  userId: number;
  name: string;
  code: string | null;
  department: string | null;
  phone: string | null;
  device: RegisteredDeviceDto | null;
  singleDevice: boolean;
  /** Last seen in the app on a phone. */
  lastSeenAt: string | null;
  /** Active app sessions on a phone. */
  phoneSessions: number;
  /** Active web sessions (browsers). Web sign-ins are never limited. */
  webSessions: number;
  webLastSeenAt: string | null;
  pendingDevice: PendingDeviceDto | null;
}

export interface EmployeeDeviceListResponseDto {
  employees: EmployeeDeviceDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  summary: { registered: number; pending: number; none: number };
}

export interface DeviceSessionDto {
  id: number;
  type: 'mobile' | 'web' | string;
  name: string | null;
  ip: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
  isRegisteredPhone: boolean;
}

export interface DeviceEventDto {
  id: number;
  event: 'registered' | 'blocked' | 'reset' | 'allowed' | 'logout' | string;
  deviceName: string | null;
  platform: string | null;
  actorName: string | null;
  at: string;
}

export interface EmployeeDeviceDetailDto extends EmployeeDeviceDto {
  sessions: { phone: DeviceSessionDto[]; web: DeviceSessionDto[] };
  events: DeviceEventDto[];
}

export interface DeviceActionResponseDto {
  success: boolean;
  message: string;
}
